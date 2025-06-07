const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('../routes');
const { setupConsoleOverride } = require('./logger');

function createApp() {
    const app = express();
    
    // 设置日志
    setupConsoleOverride();
    
    // 安全中间件
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'", 
                    "'unsafe-inline'", // 允许内联脚本（用于CDN库）
                    "https://cdnjs.cloudflare.com"
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