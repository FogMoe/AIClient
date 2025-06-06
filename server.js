const config = require('./config');
const { createApp } = require('./utils/app');
const { logger } = require('./utils/logger');
// 创建应用
const app = createApp();

// 启动服务器
app.listen(config.server.port, () => {
    console.log(`AI聊天服务器运行在 http://localhost:${config.server.port}`);
    console.log('按 Ctrl+C 停止服务器');
    
    // 记录配置信息
    logger.info('服务器配置:', {
        port: config.server.port,
        logLevel: config.logging.level,
        rateLimitEnabled: true,
        azureConfigured: config.azureOpenAI.apiKey !== "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>"
    });
});
