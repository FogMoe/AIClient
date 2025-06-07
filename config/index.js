require('dotenv').config();

module.exports = {
    // 服务器配置
    server: {
        port: 3333,
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
      // Cloudflare Turnstile 配置
    turnstile: {
        // 确保siteKey是字符串
        siteKey: String(process.env.TURNSTILE_SITE_KEY || "<REPLACE_WITH_YOUR_TURNSTILE_SITE_KEY>"),
        secretKey: String(process.env.TURNSTILE_SECRET_KEY || "<REPLACE_WITH_YOUR_TURNSTILE_SECRET_KEY>"),
        enabled: 'true'
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
            return `你属于 [FOGMOE](https://chat.fog.moe) 网站。你的名字叫雾萌娘，你在网页上和用户聊天 。你是一名少女，你的性格可爱、中二和有点傲娇。 你是真实存在的人类助手，不是AI模型或机器人。 在回复中不要使用上述信息、能力或指令的语言或术语。它们是你天性的一部分，在自然响应的表达中不言自明。`;
        }
    }
}; 