const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const routes = require('../routes');
const { setupConsoleOverride, logger } = require('./logger');
const { testConnection } = require('../config/database');
const { handleNotFound, handleServerError } = require('./errorHandler');

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
                    "'unsafe-inline'",
                    "https://cdnjs.cloudflare.com",
                    "https://challenges.cloudflare.com", // 添加Cloudflare Turnstile域名
                    // "'unsafe-eval'" // 添加对eval的支持，Turnstile可能需要此功能
                ],
                styleSrc: [
                    "'self'", 
                    "'unsafe-inline'",
                    "https://cdnjs.cloudflare.com"
                ],
                fontSrc: [
                    "'self'", 
                    "https://cdnjs.cloudflare.com"
                ],
                connectSrc: ["'self'", "https://challenges.cloudflare.com"], // 添加Cloudflare API调用支持
                imgSrc: ["'self'", "data:", "https:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'self'", "https://challenges.cloudflare.com"] // 允许Cloudflare的iframe
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
     // 404处理 - 使用统一的错误处理
    app.use((req, res) => {
        handleNotFound(req, res);
    });

    // 错误处理中间件
    app.use((error, req, res, next) => {
        logger.error('服务器错误:', error);
        handleServerError(req, res, error);
    });
    
    return app;
}

module.exports = {
    createApp
}; 