const express = require('express');
const path = require('path');
const chatRoutes = require('./chat');
const chatHistoryRoutes = require('./chatHistory');
const lotteryRoutes = require('./lottery');
const { router: authRoutes, requireAuth } = require('./auth');
const config = require('../config');

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

// 聊天历史API路由（需要登录）
router.use('/api/chat-history', requireAuth, chatHistoryRoutes);

// 抽奖路由
router.use('/api/lottery', requireAuth, lotteryRoutes);

// Turnstile配置API
router.get('/api/turnstile-config', (req, res) => {
    // 确保siteKey是字符串类型
    let siteKey = config.turnstile.siteKey;
    if (siteKey && typeof siteKey !== 'string') {
        siteKey = String(siteKey);
    }
    
    res.json({
        enabled: config.turnstile.enabled,
        siteKey: siteKey
    });
});

// 错误页面路由
router.get('/error', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'error.html'));
});

// 健康检查端点
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;