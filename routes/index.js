const express = require('express');
const path = require('path');
const chatRoutes = require('./chat');
const { router: authRoutes, requireAuth } = require('./auth');

const router = express.Router();

// 认证路由
router.use('/auth', authRoutes);

// 提供静态文件（需要登录）
router.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 聊天API路由（需要登录）
router.use('/api/chat', requireAuth, chatRoutes);

// 健康检查端点
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router; 