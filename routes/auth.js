const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { validateLogin, getUserById, isUsernameTaken, createWebUser } = require('../config/database');
const { logger } = require('../utils/logger');
const { handleUnauthorized } = require('../utils/errorHandler');
const { verifyTurnstile } = require('../utils/turnstile');
const config = require('../config');

// 登录失败计数器（内存存储，生产环境建议使用Redis）
const loginAttempts = new Map();

// 注册尝试计数器（内存存储，生产建议Redis）
const registerAttempts = new Map();

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

// 清理注册尝试
function cleanupRegisterAttempts() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    for (const [ip, data] of registerAttempts.entries()) {
        if (now - data.firstAttempt > oneHour) {
            registerAttempts.delete(ip);
        }
    }
}

setInterval(cleanupRegisterAttempts, 60 * 60 * 1000);

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

// 生成数学验证码
function createMathCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1; // 1-10
    const b = Math.floor(Math.random() * 10) + 1;
    return { question: `${a} + ${b} = ?`, answer: a + b };
}

// 提供验证码题目
router.get('/math-captcha', (req, res) => {
    const { question, answer } = createMathCaptcha();
    req.session.captchaAnswer = answer;
    res.json({ question });
});

// 注册页面
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.sendFile('register.html', { root: './public' });
});

// 处理注册请求
router.post('/register', async (req, res) => {
    try {
        const { username, password, confirmPassword, captcha } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        // 注册频率限制：每 IP 每小时最多 3 次
        const regData = registerAttempts.get(clientIP) || { count: 0, firstAttempt: Date.now() };
        const oneHour = 60 * 60 * 1000;
        if (regData.count >= 3 && (Date.now() - regData.firstAttempt) < oneHour) {
            const remaining = Math.ceil((oneHour - (Date.now() - regData.firstAttempt)) / 60000);
            return res.status(429).json({ success: false, message: `注册次数过多，请 ${remaining} 分钟后再试` });
        }

        // 输入非空检查
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: '请填写完整信息' });
        }

        // 用户名格式：3-20 位，仅字母数字下划线
        const usernameRegex = /^[A-Za-z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ success: false, message: '用户名需为 3-20 位字母、数字或下划线' });
        }

        // 密码格式：6-20 位，需同时包含字母和数字
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{6,20}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ success: false, message: '密码需为 6-20 位且同时包含字母和数字' });
        }

        // 确认密码
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: '两次输入的密码不一致' });
        }

        // 校验验证码
        const expected = req.session.captchaAnswer;
        if (typeof expected === 'undefined' || parseInt(captcha, 10) !== expected) {
            return res.status(400).json({ success: false, message: '验证码错误，请重试' });
        }

        // 清除验证码，防止复用
        delete req.session.captchaAnswer;

        // 检查用户名是否被占用
        const taken = await isUsernameTaken(username);
        if (taken) {
            return res.status(409).json({ success: false, message: '用户名已存在' });
        }

        // 哈希密码
        const hashedPassword = hashPassword(password);

        // 创建用户
        const newUserId = await createWebUser(username, hashedPassword);

        // 记录注册尝试（成功后）
        if (registerAttempts.has(clientIP)) {
            regData.count += 1;
            registerAttempts.set(clientIP, regData);
        } else {
            registerAttempts.set(clientIP, { count: 1, firstAttempt: Date.now() });
        }

        return res.json({ success: true, message: '注册成功，请登录', userId: newUserId });
    } catch (error) {
        logger.error('注册错误:', error.message || error);
        return res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
    }
});

// 处理登录请求
router.post('/login', async (req, res) => {
    try {
        const { userId, password, turnstileToken } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;

        // 验证输入（先进行基本验证）
        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户ID/用户名和密码'
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

        // Turnstile验证
        if (config.turnstile.enabled) {
            const isValidTurnstile = await verifyTurnstile(turnstileToken, clientIP);
            if (!isValidTurnstile) {
                return res.status(400).json({
                    success: false,
                    message: '人机验证失败，请重试'
                });
            }
        }

        // 现在userId已经验证过了，可以安全使用
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

        // 对密码进行SHA256加密
        const hashedPassword = hashPassword(password);
        
        // 验证用户登录
        const user = await validateLogin(userId, hashedPassword);
        
        if (user) {
            // 登录成功，清除失败计数
            loginAttempts.delete(attemptKey);
            
            // 获取完整用户信息
            const userInfo = await getUserById(user.user_id);
            
            // 设置会话
            req.session.user = {
                id: userInfo.id,
                name: userInfo.name,
                coins: userInfo.coins,
                permission: userInfo.permission
            };

            // 只在开发环境记录详细登录信息
            if (process.env.NODE_ENV === 'development') {
                logger.info(`用户登录成功: ${userInfo.name} (ID: ${userId}) from IP: ${clientIP}`);
            }
            
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
            
            // 记录安全相关的失败日志（保留用于安全监控）
            logger.warn(`登录失败: 用户ID ${userId} from IP: ${clientIP} (尝试次数: ${currentAttempts.count})`);
            res.status(401).json({
                success: false,
                message: '用户名或密码错误，如果您还没有注册，请先前往注册账号'
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
            // 只在开发环境记录详细登出信息
            if (process.env.NODE_ENV === 'development') {
                logger.info(`用户登出: ${userName}`);
            }
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
        handleUnauthorized(req, res);
    }
}

module.exports = { router, requireAuth };