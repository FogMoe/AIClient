const express = require('express');
const router = express.Router();
const { rateLimitMiddleware } = require('../middleware/rateLimiter');
const { processChat } = require('../services/aiService');
const { saveChatHistory, getChatHistory, updateUserCoins, getUserById } = require('../config/database');
const { logger } = require('../utils/logger');

// 输入验证和清理函数
function validateAndSanitizeInput(message) {
    // 基本验证
    if (!message || typeof message !== 'string') {
        throw new Error('消息格式无效');
    }
    
    // 长度验证
    if (message.length > 5000) {
        throw new Error('消息长度不能超过5000个字符');
    }
    
    // 清理潜在的恶意内容
    const sanitized = message
        .replace(/<script[\s\S]*?<\/script>/gi, '') // 移除script标签
        .replace(/javascript:/gi, '') // 移除javascript协议
        .replace(/on\w+\s*=/gi, '') // 移除事件属性
        .trim();
    
    // 检查是否为空
    if (!sanitized) {
        throw new Error('消息不能为空');
    }
    
    return sanitized;
}

// 验证对话历史
function validateHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }
    
    // 限制历史记录长度
    const maxHistoryLength = 20;
    const validHistory = history.slice(-maxHistoryLength);
    
    return validHistory.filter(msg => 
        msg && 
        typeof msg === 'object' && 
        typeof msg.content === 'string' && 
        msg.content.length <= 10000 &&
        ['user', 'assistant'].includes(msg.role)
    );
}

// AI聊天API路由
router.post('/', rateLimitMiddleware, async (req, res) => {
    try {
        const { message, history = [], sessionId = 'unknown', isHistoryFetch } = req.body;
        
        // 验证和清理输入
        const sanitizedMessage = validateAndSanitizeInput(message);
        
        // 特殊处理ping请求 - 直接返回pong，不扣除金币
        if (sanitizedMessage === 'ping') {
            logger.info('收到ping请求，返回连接正常响应');
            return res.json({
                response: 'pong',
                timestamp: new Date().toISOString()
            });
        }
        
        // 如果用户已登录，从数据库加载历史记录
        let validatedHistory = [];
        if (req.session.user) {
            try {
                const userId = req.session.user.id;
                const dbHistoryRecord = await getChatHistory(userId);
                const dbHistory = dbHistoryRecord ? dbHistoryRecord.messages : [];
                validatedHistory = validateHistory(dbHistory);
                logger.info(`从数据库加载历史记录，长度: ${validatedHistory.length}`);
            } catch (error) {
                logger.error('加载历史记录失败:', error.message);
                // 如果加载失败，使用前端传来的历史记录作为备选
                validatedHistory = validateHistory(history);
            }
        } else {
            // 未登录用户使用前端传来的历史记录
            validatedHistory = validateHistory(history);
        }
        
        // 验证会话ID
        const validSessionId = typeof sessionId === 'string' && sessionId.length <= 50 
            ? sessionId.replace(/[^a-zA-Z0-9\-_]/g, '') 
            : 'unknown';

        // 调试日志 
        logger.info(`接收到消息，长度: ${sanitizedMessage.length}`);
        logger.info(`对话历史长度: ${validatedHistory.length}`);
        logger.info(`会话ID: ${validSessionId}`);
        if (isHistoryFetch) {
            logger.info(`这是历史记录获取请求，不扣除金币`);
        }

        // 如果用户已登录，计算并扣除金币（只在真正的用户消息发送时扣除，而不是历史记录获取时）
        if (req.session.user && !isHistoryFetch && sanitizedMessage !== 'ping') {
            const userId = req.session.user.id;
            
            // 根据消息长度计算金币消耗
            let coinCost = 1;
            if (sanitizedMessage.length > 600) {
                coinCost = 3;
            } else if (sanitizedMessage.length > 300) {
                coinCost = 2;
            }
            
            // 获取当前用户信息并检查金币余额
            const userInfo = await getUserById(userId);
            if (!userInfo || userInfo.coins < coinCost) {
                // 金币不足，直接返回提示消息
                logger.warn(`用户 ${userId} 金币不足，需要 ${coinCost} 枚，当前余额 ${userInfo ? userInfo.coins : 0}`);
                return res.json({
                    response: "您的金币余额不足，无法继续对话。请前往[Telegram机器人](https://t.me/FogMoeBot)获取更多金币。",
                    coinShortage: true,
                    timestamp: new Date().toISOString()
                });
            }
            
            // 扣除金币
            const updateResult = await updateUserCoins(userId, -coinCost);
            if (!updateResult.success) {
                logger.error(`用户 ${userId} 金币扣除失败`);
                return res.status(500).json({
                    error: "金币扣除失败，请稍后再试",
                    timestamp: new Date().toISOString()
                });
            }
            
            // 更新session中的金币数量
            req.session.user.coins = updateResult.newCoins;
            
            logger.info(`用户 ${userId} 扣除金币 ${coinCost}，当前余额 ${updateResult.newCoins}`);
        }

        // 处理AI聊天
        const result = await processChat(
            sanitizedMessage, 
            validatedHistory, 
            validSessionId,
            req.session.user ? req.session.user.coins : undefined
        );
        
        // 如果扣除了金币，添加到响应中
        if (req.session.user) {
            result.updatedCoins = req.session.user.coins;
        }
        
        // 如果用户已登录且聊天成功，保存聊天记录
        if (req.session.user && result.response && sanitizedMessage !== 'ping') {
            try {
                const userId = req.session.user.id;
                
                // 创建新的消息对（用户消息和AI回复）
                const newMessages = [
                    { role: 'user', content: sanitizedMessage },
                    { role: 'assistant', content: result.response }
                ];
                
                // 过滤掉测试消息（ping-pong等）
                const filteredNewMessages = newMessages.filter(msg => {
                    const content = msg.content.toLowerCase().trim();
                    // 过滤ping-pong测试消息
                    if (content === 'ping' || content === 'pong') {
                        return false;
                    }
                    // 过滤其他明确的测试消息
                    if (/^(test|测试)$/i.test(content)) {
                        return false;
                    }
                    return true;
                });
                
                // 只有在有有效消息时才保存，且不是历史记录获取请求
                if (filteredNewMessages.length > 0 && !isHistoryFetch) {
                    // 立即保存聊天记录，等待完成而不是异步
                    try {
                        await saveChatHistory(userId, filteredNewMessages);
                        logger.info(`用户 ${userId} 的聊天记录已保存，消息数量: ${filteredNewMessages.length}`);
                    } catch (saveError) {
                        logger.error('保存聊天记录失败:', saveError.message);
                        // 保存失败不影响响应返回
                    }
                }
            } catch (error) {
                logger.error('处理聊天记录保存时出错:', error.message);
            }
        }
        
        res.json(result);

    } catch (error) {
        if (error.message.includes('消息格式无效') || 
            error.message.includes('消息长度') || 
            error.message.includes('消息不能为空')) {
            return res.status(400).json({ 
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
        
        logger.error('API错误:', error.message);
        res.status(500).json({ 
            error: '抱歉，AI服务暂时不可用，请稍后再试',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;