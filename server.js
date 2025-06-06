const express = require('express');
const cors = require('cors');
const path = require('path');
const { AzureOpenAI } = require("openai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
        const { message, history = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: '消息不能为空' });
        }

        // 调试日志：显示接收到的对话历史
        console.log('接收到的消息:', message);
        console.log('对话历史长度:', history.length);
        if (history.length > 0) {
            console.log('最近3条历史:', history.slice(-3));
        }

        // Azure OpenAI 配置
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "<REPLACE_WITH_YOUR_ENDPOINT_VALUE_HERE>";
        const apiKey = process.env.AZURE_OPENAI_API_KEY || "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>";
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "<REPLACE_WITH_YOUR_API_VERSION_VALUE_HERE>";
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "<REPLACE_WITH_YOUR_DEPLOYMENT_VALUE_HERE>";

        // 如果没有配置API密钥，返回模拟响应
        if (!process.env.AZURE_OPENAI_API_KEY || apiKey === "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>") {
            console.log('未配置Azure OpenAI API密钥，使用模拟响应');
            const simulatedResponse = generateSimulatedResponse(message, history);
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

            // 构建完整的对话消息数组
            const messages = [
                { role: "system", content: "你是雾萌AI助手，一个友好、有帮助的AI助手。请用简体中文回答用户的问题。" },
                ...history, // 添加对话历史
                { role: "user", content: message } // 添加当前用户消息
            ];

            const result = await client.chat.completions.create({
                messages: messages,
                max_tokens: 1000,
                temperature: 1.0,
            });

            const aiResponse = result.choices[0].message.content;

            res.json({ 
                response: aiResponse,
                timestamp: new Date().toISOString()
            });

        } catch (azureError) {
            console.error('Azure OpenAI 错误:', azureError.message);
            
            // 如果Azure认证或API调用失败，回退到模拟响应
            const simulatedResponse = generateSimulatedResponse(message, history);
            res.json({ 
                response: simulatedResponse + '\n\n*注意：当前使用演示模式，因为Azure OpenAI服务不可用*',
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