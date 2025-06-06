const express = require('express');
const cors = require('cors');
const path = require('path');
const { AzureOpenAI } = require("openai");
require('dotenv').config();
const winston = require('winston');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 频率限制配置
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟（毫秒）
const RATE_LIMIT_MAX_REQUESTS = 5; // 每分钟最大请求数
const sessionRequestTimes = new Map(); // 存储每个session的请求时间戳

// 清理过期的请求记录
function cleanupExpiredRequests(sessionId) {
    const now = Date.now();
    const requestTimes = sessionRequestTimes.get(sessionId) || [];
    const validTimes = requestTimes.filter(time => (now - time) < RATE_LIMIT_WINDOW);
    sessionRequestTimes.set(sessionId, validTimes);
    return validTimes;
}

// 检查频率限制
function checkRateLimit(sessionId) {
    const validTimes = cleanupExpiredRequests(sessionId);
    return validTimes.length < RATE_LIMIT_MAX_REQUESTS;
}

// 记录请求时间
function recordRequest(sessionId) {
    const validTimes = cleanupExpiredRequests(sessionId);
    validTimes.push(Date.now());
    sessionRequestTimes.set(sessionId, validTimes);
}

// 日志管理
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: logDir + '/server.log', maxsize: 1024 * 1024 * 5, maxFiles: 5 }),
        new winston.transports.Console()
    ]
});

// 替换console.log/console.error为logger
console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 提供静态文件
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// AI聊天API路由
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [], sessionId = 'unknown' } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: '消息不能为空' });
        }

        // 检查频率限制
        if (!checkRateLimit(sessionId)) {
            const validTimes = cleanupExpiredRequests(sessionId);
            const oldestRequestTime = Math.min(...validTimes);
            const timeUntilReset = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - oldestRequestTime)) / 1000);
            
            console.log(`会话 ${sessionId} 触发频率限制，剩余等待时间: ${timeUntilReset}秒`);
            
            return res.status(429).json({ 
                error: `您的对话过于频繁，请稍后再试。`,
                rateLimitExceeded: true,
                retryAfter: timeUntilReset,
                timestamp: new Date().toISOString()
            });
        }

        // 记录此次请求
        recordRequest(sessionId);

        // 调试日志：显示接收到的消息信息
        console.log('接收到的消息:', message);
        console.log('对话历史长度:', history.length);
        console.log('会话ID:', sessionId);

        // Azure OpenAI 配置
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "<REPLACE_WITH_YOUR_ENDPOINT_VALUE_HERE>";
        const apiKey = process.env.AZURE_OPENAI_API_KEY || "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>";
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "<REPLACE_WITH_YOUR_API_VERSION_VALUE_HERE>";
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "<REPLACE_WITH_YOUR_DEPLOYMENT_VALUE_HERE>";

        // 特殊处理ping请求，避免消耗API配额
        if (message === 'ping') {
            console.log('收到ping请求，返回连接正常响应');
            return res.json({ 
                response: 'pong',
                timestamp: new Date().toISOString()
            });
        }

        // 如果没有配置API密钥，返回模拟响应
        if (!process.env.AZURE_OPENAI_API_KEY || apiKey === "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>") {
            console.log('未配置Azure OpenAI API密钥，使用模拟响应');
            const simulatedResponse = generateSimulatedResponse(message, history);
            
            // 写入对话历史日志
            if (sessionId !== 'unknown') {
                const fullHistory = [...history, { role: "assistant", content: simulatedResponse }];
                const historyLogPath = `${logDir}/history-${sessionId}.log`;
                const historyLogEntry = `\n[${new Date().toISOString()}]\n${JSON.stringify(fullHistory, null, 2)}\n`;
                fs.appendFile(historyLogPath, historyLogEntry, err => {
                    if (err) logger.error('写入对话历史日志失败:', err);
                });
            }
            
            return res.json({ 
                response: simulatedResponse,
                timestamp: new Date().toISOString()
            });
        }

        try {
            // 使用API密钥初始化 AzureOpenAI 客户端
            const client = new AzureOpenAI({ 
                endpoint, 
                apiKey, 
                apiVersion, 
                deployment 
            });

            // 构建完整的对话消息数组（history已经包含当前用户消息）
            const messages = [
                { role: "system", content: "你是雾萌AI助手，一个友好、有帮助的AI助手。请用简体中文回答用户的问题。" },
                ...history // 对话历史已包含当前用户消息
            ];

            const result = await client.chat.completions.create({
                messages: messages,
                max_tokens: 1000,
                temperature: 1.0,
            });

            const aiResponse = result.choices[0].message.content;

            // 写入对话历史日志
            if (sessionId !== 'unknown') {
                const fullHistory = [...history, { role: "assistant", content: aiResponse }];
                const historyLogPath = `${logDir}/history-${sessionId}.log`;
                const historyLogEntry = `\n[${new Date().toISOString()}]\n${JSON.stringify(fullHistory, null, 2)}\n`;
                fs.appendFile(historyLogPath, historyLogEntry, err => {
                    if (err) logger.error('写入对话历史日志失败:', err);
                });
            }

            res.json({ 
                response: aiResponse,
                timestamp: new Date().toISOString()
            });

        } catch (azureError) {
            console.error('Azure OpenAI 错误:', azureError.message);
            
            // 如果Azure认证或API调用失败，回退到模拟响应
            const simulatedResponse = generateSimulatedResponse(message, history);
            const fallbackResponse = simulatedResponse + '\n\n*注意：当前使用演示模式，因为Azure OpenAI服务不可用*';
            
            // 写入对话历史日志
            if (sessionId !== 'unknown') {
                const fullHistory = [...history, { role: "assistant", content: fallbackResponse }];
                const historyLogPath = `${logDir}/history-${sessionId}.log`;
                const historyLogEntry = `\n[${new Date().toISOString()}]\n${JSON.stringify(fullHistory, null, 2)}\n`;
                fs.appendFile(historyLogPath, historyLogEntry, err => {
                    if (err) logger.error('写入对话历史日志失败:', err);
                });
            }
            
            res.json({ 
                response: fallbackResponse,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('API错误:', error.message);
        res.status(500).json({ 
            error: '抱歉，AI服务暂时不可用，请稍后再试',
            timestamp: new Date().toISOString()
        });
    }
});

// 模拟AI响应函数
function generateSimulatedResponse(message, history = []) {
    // 如果有对话历史，尝试生成更有上下文的回复
    if (history.length > 0) {
        const lastUserMessage = history.filter(msg => msg.role === 'user').pop();
        if (lastUserMessage) {
            const contextResponses = [
                `我记得您之前提到了"${lastUserMessage.content}"，现在您又说"${message}"。让我结合这些信息来回答您。`,
                `基于我们之前的对话，特别是您提到的"${lastUserMessage.content}"，我认为"${message}"是一个很好的延续。`,
                `我注意到您在继续我们之前关于"${lastUserMessage.content}"的讨论。关于"${message}"，我有以下想法...`,
                `结合您之前的问题和现在的"${message}"，我觉得我们的对话很有深度。`,
                `从您之前的"${lastUserMessage.content}"到现在的"${message}"，我看到了思路的发展。`
            ];
            return contextResponses[Math.floor(Math.random() * contextResponses.length)];
        }
    }
    
    // 默认响应（没有历史记录时）
    const responses = [
        `您好！我收到了您的消息："${message}"。我是一个AI助手，目前在演示模式下运行。`,
        `这是一个很有趣的问题。关于"${message}"，我认为这需要仔细考虑。`,
        `感谢您的提问："${message}"。我正在处理您的请求...`,
        `您提到了"${message}"，这让我想到了很多相关的话题。`,
        `我理解您说的"${message}"。让我为您提供一些有用的信息。`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`AI聊天服务器运行在 http://localhost:${PORT}`);
    console.log('按 Ctrl+C 停止服务器');
});
