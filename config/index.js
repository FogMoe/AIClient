require('dotenv').config();

module.exports = {
    // 服务器配置
    server: {
        port: 3000,
        host: 'localhost'
    },
    
    // Azure OpenAI 配置
    azureOpenAI: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT || "<REPLACE_WITH_YOUR_ENDPOINT_VALUE_HERE>",
        apiKey: process.env.AZURE_OPENAI_API_KEY || "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>",
        apiVersion: "2025-01-01-preview",
        deployment: "gpt-4",
        maxTokens: 1000,
        temperature: 1.0
    },
    
    // 频率限制配置
    rateLimit: {
        windowMs: 60 * 1000, // 1分钟（毫秒）
        maxRequests: 5, // 每分钟最大请求数
    },
    
    // 日志配置
    logging: {
        level: 'info',
        logDir: 'logs',
        maxLogSize: 1024 * 1024 * 5, // 5MB
        maxLogFiles: 5
    },
    
    // AI助手配置
    assistant: {
        getSystemMessage: () => {
            const now = new Date();
            const timeString = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'long',
                timeZone: 'Asia/Shanghai'
            });
            return `你是由雾萌(FOGMOE)开发的AI助手，运行于 https://chat.fog.moe 。当前时间：${timeString}`;
        }
    }
}; 