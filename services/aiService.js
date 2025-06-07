const { AzureOpenAI } = require("openai");
const config = require('../config');
const { logger } = require('../utils/logger');

// 安全清理函数（用于后端）
function sanitizeForDisplay(text) {
    if (typeof text !== 'string') {
        return '';
    }
    // 移除潜在的HTML标签和脚本
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// 模拟AI响应函数
function generateSimulatedResponse(message, history = []) {
    // 清理输入以防止注入
    const safeMessage = sanitizeForDisplay(message);
    
    // 如果有对话历史，尝试生成更有上下文的回复
    if (history.length > 0) {
        const lastUserMessage = history.filter(msg => msg.role === 'user').pop();
        if (lastUserMessage && lastUserMessage.content) {
            const safeLastMessage = sanitizeForDisplay(lastUserMessage.content);
            const contextResponses = [
                `我记得您之前提到了"${safeLastMessage}"，现在您又说"${safeMessage}"。让我结合这些信息来回答您。`,
                `基于我们之前的对话，特别是您提到的"${safeLastMessage}"，我认为"${safeMessage}"是一个很好的延续。`,
                `我注意到您在继续我们之前关于"${safeLastMessage}"的讨论。关于"${safeMessage}"，我有以下想法...`,
                `结合您之前的问题和现在的"${safeMessage}"，我觉得我们的对话很有深度。`,
                `从您之前的"${safeLastMessage}"到现在的"${safeMessage}"，我看到了思路的发展。`
            ];
            return contextResponses[Math.floor(Math.random() * contextResponses.length)];
        }
    }
    
    // 默认响应（没有历史记录时）
    const responses = [
        `您好！我收到了您的消息："${safeMessage}"。我是一个AI助手，目前在演示模式下运行。`,
        `这是一个很有趣的问题。关于"${safeMessage}"，我认为这需要仔细考虑。`,
        `感谢您的提问："${safeMessage}"。我正在处理您的请求...`,
        `您提到了"${safeMessage}"，这让我想到了很多相关的话题。`,
        `我理解您说的"${safeMessage}"。让我为您提供一些有用的信息。`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

// 检查是否配置了Azure OpenAI
function isAzureConfigured() {
    return config.azureOpenAI.apiKey !== "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>" && 
           config.azureOpenAI.apiKey !== "";
}

// 处理AI聊天请求
async function processChat(message, history, sessionId) {
    try {
        // 特殊处理ping请求
        if (message === 'ping') {
            logger.info('收到ping请求，返回连接正常响应');
            return {
                response: 'pong',
                timestamp: new Date().toISOString()
            };
        }

        // 如果没有配置API密钥，返回模拟响应
        if (!isAzureConfigured()) {
            logger.info('未配置Azure OpenAI API密钥，使用模拟响应');
            const simulatedResponse = generateSimulatedResponse(message, history);
            

            
            return {
                response: simulatedResponse,
                timestamp: new Date().toISOString()
            };
        }

        // 使用Azure OpenAI
        try {
            const client = new AzureOpenAI({
                endpoint: config.azureOpenAI.endpoint,
                apiKey: config.azureOpenAI.apiKey,
                apiVersion: config.azureOpenAI.apiVersion,
                deployment: config.azureOpenAI.deployment
            });

            // 构建完整的对话消息数组
            const messages = [
                { role: "system", content: config.assistant.getSystemMessage() },
                ...history,
                { role: "user", content: message }
            ];

            const result = await client.chat.completions.create({
                messages: messages,
                max_tokens: config.azureOpenAI.maxTokens,
                temperature: config.azureOpenAI.temperature,
            });

            let aiResponse = result.choices[0].message.content;

            // 对AI回复进行基本的安全检查（移除明显的脚本攻击）
            if (typeof aiResponse === 'string') {
                aiResponse = aiResponse
                    .replace(/<script[\s\S]*?<\/script>/gi, '') // 移除script标签
                    .replace(/javascript:/gi, '') // 移除javascript协议
                    .replace(/on\w+\s*=/gi, ''); // 移除事件属性
            } else {
                aiResponse = '抱歉，出现异常，请稍后再试';
            }



            return {
                response: aiResponse,
                timestamp: new Date().toISOString()
            };

        } catch (azureError) {
            logger.error('Azure OpenAI 错误:', azureError.message);
            
            // 如果Azure认证或API调用失败，回退到模拟响应
            const simulatedResponse = generateSimulatedResponse(message, history);
            const fallbackResponse = simulatedResponse + '\n\n*注意：当前使用演示模式，因为AI服务不可用*';
            

            
            return {
                response: fallbackResponse,
                timestamp: new Date().toISOString()
            };
        }

    } catch (error) {
        logger.error('AI服务错误:', error.message);
        throw error;
    }
}

module.exports = {
    processChat,
    generateSimulatedResponse,
    isAzureConfigured,
    sanitizeForDisplay
};