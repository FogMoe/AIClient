const express = require('express');
const cors = require('cors');
const routes = require('../routes');
const { setupConsoleOverride } = require('./logger');

function createApp() {
    const app = express();
    
    // 设置日志
    setupConsoleOverride();
    
    // 中间件
    app.use(cors());
    app.use(express.json());
    app.use(express.static('public'));
    
    // 路由
    app.use('/', routes);
    
    return app;
}

module.exports = {
    createApp
}; 