const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const routes = require('../routes');
const { setupConsoleOverride } = require('./logger');
const { testConnection } = require('../config/database');

function createApp() {
    const app = express();
    
    // 信任代理（用于获取真实IP地址）
    app.set('trust proxy', 1);
    
    // 设置日志
    setupConsoleOverride();
    
    // 安全中间件
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'", 
                    "https://cdnjs.cloudflare.com"
                    // 注意：移除了'unsafe-inline'以提高安全性
                    // 如果需要内联脚本，请使用nonce或hash
                ],
                styleSrc: [
                    "'self'", 
                    "'unsafe-inline'", // 样式的unsafe-inline相对安全，但建议使用nonce
                    "https://cdnjs.cloudflare.com"
                ],
                fontSrc: [
                    "'self'", 
                    "https://cdnjs.cloudflare.com"
                ],
                connectSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            },
        },
        crossOriginEmbedderPolicy: false, // 避免CORS问题
    }));
    
    // CORS配置
    app.use(cors({
        origin: process.env.NODE_ENV === 'production' 
            ? ['https://chat.fog.moe'] // 生产环境只允许特定域名
            : true, // 开发环境允许所有来源
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // 解析JSON（限制大小）
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // 会话配置
    app.use(session({
        secret: process.env.SESSION_SECRET || 'fogmoe-ai-chat-secret-key-2025',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24小时
        }
    }));
    
    // 测试数据库连接
    testConnection();
    
    // 静态文件服务
    app.use(express.static('public'));
    
    // 路由
    app.use('/', routes);
    
    // 404处理
    app.use((req, res) => {
        res.status(404).json({
            error: '页面不存在',
            timestamp: new Date().toISOString()
        });
    });
    
    // 错误处理中间件
    app.use((error, req, res, next) => {
        console.error('服务器错误:', error);
        res.status(500).json({
            error: '服务器内部错误',
            timestamp: new Date().toISOString()
        });
    });
    
    return app;
}

module.exports = {
    createApp
}; 