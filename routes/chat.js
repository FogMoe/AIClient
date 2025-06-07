const express = require('express');
const router = express.Router();
const { rateLimitMiddleware } = require('../middleware/rateLimiter');
const { processChat } = require('../services/aiService');
const { saveChatHistory, getChatHistory } = require('../config/database');
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
        const { message, history = [], sessionId = 'unknown' } = req.body;
        
        // 验证和清理输入
        const sanitizedMessage = validateAndSanitizeInput(message);
        
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

        // 处理AI聊天
        const result = await processChat(sanitizedMessage, validatedHistory, validSessionId);
        
        // 如果用户已登录且聊天成功，保存聊天记录
        if (req.session.user && result.response) {
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
                
                // 只有在有有效消息时才保存
                if (filteredNewMessages.length > 0) {
                    // 异步保存聊天记录，不阻塞响应
                    saveChatHistory(userId, filteredNewMessages).catch(error => {
                        logger.error('保存聊天记录失败:', error.message);
                    });
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