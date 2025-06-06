const express = require('express');
const router = express.Router();
const { rateLimitMiddleware } = require('../middleware/rateLimiter');
const { processChat } = require('../services/aiService');
const { logger } = require('../utils/logger');

// AI聊天API路由
router.post('/', rateLimitMiddleware, async (req, res) => {
    try {
        const { message, history = [], sessionId = 'unknown' } = req.body;
        
        // 验证消息
        if (!message) {
            return res.status(400).json({ error: '消息不能为空' });
        }

        // 调试日志
        logger.info('接收到的消息:', message);
        logger.info('对话历史长度:', history.length);
        logger.info('会话ID:', sessionId);

        // 处理AI聊天
        const result = await processChat(message, history, sessionId);
        
        res.json(result);

    } catch (error) {
        logger.error('API错误:', error.message);
        res.status(500).json({ 
            error: '抱歉，AI服务暂时不可用，请稍后再试',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router; 