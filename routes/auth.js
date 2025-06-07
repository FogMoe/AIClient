const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { validateLogin, getUserById } = require('../config/database');
const { logger } = require('../utils/logger');

// 登录失败计数器（内存存储，生产环境建议使用Redis）
const loginAttempts = new Map();

// 清理过期的登录尝试记录
function cleanupLoginAttempts() {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    for (const [key, data] of loginAttempts.entries()) {
        if (now - data.lastAttempt > fifteenMinutes) {
            loginAttempts.delete(key);
        }
    }
}

// 每小时清理一次过期记录
setInterval(cleanupLoginAttempts, 60 * 60 * 1000);

// SHA256加密函数
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// 登录页面
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.sendFile('login.html', { root: './public' });
});

// 处理登录请求
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        const attemptKey = `${clientIP}:${userId}`;

        // 检查暴力破解防护
        const attempts = loginAttempts.get(attemptKey);
        if (attempts && attempts.count >= 5) {
            const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
            const fifteenMinutes = 15 * 60 * 1000;
            
            if (timeSinceLastAttempt < fifteenMinutes) {
                const remainingTime = Math.ceil((fifteenMinutes - timeSinceLastAttempt) / 1000 / 60);
                return res.status(429).json({
                    success: false,
                    message: `登录尝试过于频繁，请${remainingTime}分钟后再试`
                });
            } else {
                // 重置计数器
                loginAttempts.delete(attemptKey);
            }
        }

        // 验证输入
        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户ID和密码'
            });
        }

        // 增强的输入验证
        if (typeof userId !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: '输入格式无效'
            });
        }

        if (userId.length > 50 || password.length > 200) {
            return res.status(400).json({
                success: false,
                message: '输入长度超出限制'
            });
        }

        // 基本的SQL注入防护（虽然我们使用了参数化查询）
        if (userId.includes('\x00') || password.includes('\x00')) {
            return res.status(400).json({
                success: false,
                message: '输入包含非法字符'
            });
        }

        // 对密码进行SHA256加密
        const hashedPassword = hashPassword(password);
        
        // 验证用户登录
        const user = await validateLogin(userId, hashedPassword);
        
        if (user) {
            // 登录成功，清除失败计数
            loginAttempts.delete(attemptKey);
            
            // 获取完整用户信息
            const userInfo = await getUserById(userId);
            
            // 设置会话
            req.session.user = {
                id: userInfo.id,
                name: userInfo.name,
                coins: userInfo.coins,
                permission: userInfo.permission
            };

            logger.info(`用户登录成功: ${userInfo.name} (ID: ${userId}) from IP: ${clientIP}`);
            
            res.json({
                success: true,
                message: '登录成功',
                user: {
                    id: userInfo.id,
                    name: userInfo.name,
                    coins: userInfo.coins
                }
            });
        } else {
            // 登录失败，增加失败计数
            const currentAttempts = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };
            currentAttempts.count += 1;
            currentAttempts.lastAttempt = Date.now();
            loginAttempts.set(attemptKey, currentAttempts);
            
            logger.warn(`登录失败: 用户ID ${userId} from IP: ${clientIP} (尝试次数: ${currentAttempts.count})`);
            res.status(401).json({
                success: false,
                message: '用户ID或密码错误，如果您还没有注册，请先前往Telegram机器人注册账号'
            });
        }
    } catch (error) {
        logger.error('登录错误:', error.message);
        res.status(500).json({
            success: false,
            message: '登录服务暂时不可用，请稍后再试'
        });
    }
});

// 登出
router.post('/logout', (req, res) => {
    if (req.session.user) {
        const userName = req.session.user.name;
        req.session.destroy((err) => {
            if (err) {
                logger.error('登出错误:', err.message);
                return res.status(500).json({
                    success: false,
                    message: '登出失败'
                });
            }
            logger.info(`用户登出: ${userName}`);
            res.json({
                success: true,
                message: '已成功登出'
            });
        });
    } else {
        res.json({
            success: true,
            message: '您还未登录'
        });
    }
});

// 检查登录状态
router.get('/status', (req, res) => {
    if (req.session.user) {
        res.json({
            loggedIn: true,
            user: {
                id: req.session.user.id,
                name: req.session.user.name,
                coins: req.session.user.coins
            }
        });
    } else {
        res.json({
            loggedIn: false
        });
    }
});

// 中间件：要求用户登录
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: '请先登录',
            redirectUrl: '/auth/login'
        });
    }
}

module.exports = { router, requireAuth }; 