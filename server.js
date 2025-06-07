const config = require('./config');
const { createApp } = require('./utils/app');
const { logger } = require('./utils/logger');
// 创建应用
const app = createApp();

// 启动服务器
app.listen(config.server.port, () => {
    console.log(`AI聊天服务器运行在 http://localhost:${config.server.port}`);
    
    // 只在开发环境记录详细配置信息
    if (process.env.NODE_ENV === 'development') {
        console.log('按 Ctrl+C 停止服务器');
        const isAzureConfigured = config.azureOpenAI.apiKey && 
                                 config.azureOpenAI.apiKey !== "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>" && 
                                 config.azureOpenAI.apiKey.length > 0;
        
        logger.info(`服务器配置 - 端口: ${config.server.port}, 日志级别: ${config.logging.level}, 限流已启用: true, Azure API已配置: ${isAzureConfigured}`);
    }
});
