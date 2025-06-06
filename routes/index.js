const express = require('express');
const path = require('path');
const chatRoutes = require('./chat');

const router = express.Router();

// 提供静态文件
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 聊天API路由
router.use('/api/chat', chatRoutes);

// 健康检查端点
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router; 