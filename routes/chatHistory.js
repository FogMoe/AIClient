const express = require('express');
const router = express.Router();
const { getChatHistory, saveChatHistory, deleteChatHistory } = require('../config/database');
const { logger } = require('../utils/logger');
const { requireAuth } = require('./auth');

// 获取用户聊天历史记录
router.get('/:conversationId', requireAuth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.session.user.id;
        
        // 验证conversationId格式
        if (!conversationId || !/^\d+$/.test(conversationId)) {
            return res.status(400).json({
                success: false,
                message: '无效的对话ID'
            });
        }
        
        // 获取聊天记录
        const chatRecord = await getChatHistory(conversationId);
        
        if (chatRecord) {
            logger.info(`用户 ${userId} 获取聊天记录: ${conversationId}`);
            res.json({
                success: true,
                messages: chatRecord.messages,
                timestamp: chatRecord.timestamp
            });
        } else {
            res.json({
                success: true,
                messages: [],
                timestamp: null
            });
        }
    } catch (error) {
        logger.error('获取聊天历史记录错误:', error.message);
        res.status(500).json({
            success: false,
            message: '获取聊天记录失败'
        });
    }
});

// 保存聊天历史记录
router.post('/:conversationId', requireAuth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { messages } = req.body;
        const userId = req.session.user.id;
        
        // 验证conversationId格式
        if (!conversationId || !/^\d+$/.test(conversationId)) {
            return res.status(400).json({
                success: false,
                message: '无效的对话ID'
            });
        }
        
        // 验证messages格式
        if (!Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                message: '消息格式无效'
            });
        }
        
        // 保存聊天记录
        await saveChatHistory(conversationId, messages);
        
        logger.info(`用户 ${userId} 保存聊天记录: ${conversationId}`);
        res.json({
            success: true,
            message: '聊天记录保存成功'
        });
    } catch (error) {
        logger.error('保存聊天历史记录错误:', error.message);
        res.status(500).json({
            success: false,
            message: '保存聊天记录失败'
        });
    }
});

// 删除聊天历史记录
router.delete('/:conversationId', requireAuth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.session.user.id;

        // 验证conversationId格式
        if (!conversationId || !/^\d+$/.test(conversationId)) {
            return res.status(400).json({
                success: false,
                message: '无效的对话ID'
            });
        }

        // 删除聊天记录
        const result = await deleteChatHistory(conversationId);

        if (result) {
            logger.info(`用户 ${userId} 删除了聊天记录: ${conversationId}`);
            res.json({
                success: true,
                message: '聊天记录删除成功'
            });
        } else {
            // 可能记录未找到，或者删除失败但没有抛出错误
            logger.warn(`用户 ${userId} 尝试删除聊天记录 ${conversationId}，但记录未找到或删除未成功`);
            res.status(404).json({
                success: false,
                message: '聊天记录未找到或删除失败'
            });
        }
    } catch (error) {
        logger.error('删除聊天历史记录错误:', error.message);
        res.status(500).json({
            success: false,
            message: '删除聊天记录失败'
        });
    }
});

module.exports = router;