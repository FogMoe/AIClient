const { AzureOpenAI } = require("openai");
const OpenAI = require("openai");
const config = require('../config');
const { logger } = require('../utils/logger');
const { webSearch } = require('./zhipuSearchService');

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

// 检查是否配置了Azure OpenAI
function isAzureConfigured() {
    return config.azureOpenAI.apiKey !== "<REPLACE_WITH_YOUR_KEY_VALUE_HERE>" && 
           config.azureOpenAI.apiKey !== "";
}

// 检查是否配置了Gemini API
function isGeminiConfigured() {
    return config.geminiAI.enabled && 
           config.geminiAI.apiKey !== "<REPLACE_WITH_YOUR_GEMINI_API_KEY>" && 
           config.geminiAI.apiKey !== "";
}

// 定义联网搜索工具
const webSearchTool = {
    type: "function",
    function: {
        name: "web_search",
        description: "通过搜索引擎查询实时信息，获取最新的网络内容和数据",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "要搜索的关键词或短语"
                }
            },
            required: ["query"]
        }
    }
};

// 使用Gemini API处理聊天
async function processWithGemini(messages) {
    try {
        logger.info('使用Gemini API处理聊天请求');
        
        // 创建OpenAI客户端（Gemini支持OpenAI兼容API）
        const client = new OpenAI({
            apiKey: config.geminiAI.apiKey,
            baseURL: config.geminiAI.baseURL,
        });

        // 第一次调用，包含工具定义
        const result = await client.chat.completions.create({
            model: config.geminiAI.model,
            messages: messages,
            max_tokens: config.geminiAI.maxTokens,
            temperature: config.geminiAI.temperature,
            tools: [webSearchTool],
            tool_choice: "auto"
        });

        const responseMessage = result.choices[0].message;
        
        // 检查是否需要调用工具
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            logger.info('Gemini请求调用工具函数');
            
            // 将助手的响应添加到消息历史
            const updatedMessages = [...messages, responseMessage];
            
            // 处理每个工具调用
            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.function.name === 'web_search') {
                    try {
                        const args = JSON.parse(toolCall.function.arguments);
                        const searchResult = await webSearch(args.query);
                        
                        // 添加工具调用结果到消息历史
                        updatedMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: searchResult
                        });
                        
                        logger.info(`联网搜索完成，查询: ${args.query}`);
                    } catch (parseError) {
                        logger.error(`解析工具调用参数失败: ${parseError.message}`);
                        updatedMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: "搜索参数解析失败"
                        });
                    }
                }
            }
            
            // 使用更新后的消息历史再次调用API获取最终响应
            const finalResult = await client.chat.completions.create({
                model: config.geminiAI.model,
                messages: updatedMessages,
                max_tokens: config.geminiAI.maxTokens,
                temperature: config.geminiAI.temperature
            });
            
            const aiResponse = finalResult.choices[0].message.content;
            logger.info('Gemini API函数调用响应成功');
            return aiResponse;
        } else {
            // 没有工具调用，直接返回响应
            const aiResponse = responseMessage.content;
            logger.info('Gemini API响应成功');
            return aiResponse;
        }
    } catch (error) {
        let errorMessage = `Gemini API 错误: ${error && error.message ? error.message : String(error)}\n`;
        errorMessage += `Gemini 错误详情: ${error && error.stack ? error.stack : JSON.stringify(error)}\n`;
        errorMessage += `Gemini 原始错误对象(JSON): ${JSON.stringify(error)}\n`;
        errorMessage += `Gemini 原始错误对象(String): ${String(error)}\n`;
        if (error.response) {
            errorMessage += `Gemini 响应错误: ${JSON.stringify(error.response.data || error.response)}`;
        }
        logger.error(errorMessage);
        throw error;
    }
}

// 使用Azure OpenAI处理聊天
async function processWithAzure(messages) {
    try {
        logger.info('使用Azure OpenAI处理聊天请求');
        
        const client = new AzureOpenAI({
            endpoint: config.azureOpenAI.endpoint,
            apiKey: config.azureOpenAI.apiKey,
            apiVersion: config.azureOpenAI.apiVersion,
            deployment: config.azureOpenAI.deployment
        });

        const result = await client.chat.completions.create({
            messages: messages,
            max_tokens: config.azureOpenAI.maxTokens,
            temperature: config.azureOpenAI.temperature,
        });

        let aiResponse = result.choices[0].message.content;
        logger.info('Azure OpenAI响应成功');
        
        return aiResponse;
    } catch (error) {
        let errorMessage = `Azure OpenAI 错误: ${error && error.message ? error.message : String(error)}\n`;
        errorMessage += `Azure 错误详情: ${error && error.stack ? error.stack : JSON.stringify(error)}\n`;
        errorMessage += `Azure 原始错误对象(JSON): ${JSON.stringify(error)}\n`;
        errorMessage += `Azure 原始错误对象(String): ${String(error)}\n`;
        if (error.response) {
            errorMessage += `Azure 响应错误: ${JSON.stringify(error.response.data || error.response)}\n`;
        }
        logger.error(errorMessage);
        throw error;
    }
}

// 处理AI聊天请求
async function processChat(message, history, sessionId, userCoins) {
    try {
        // 特殊处理ping请求
        if (message === 'ping') {
            logger.info('收到ping请求，返回连接正常响应');
            return {
                response: 'pong',
                timestamp: new Date().toISOString()
            };
        }

        // 获取系统提示词，并添加用户硬币数量信息
        const systemMessage = config.assistant.getSystemMessage();
        const systemMessageWithCoins = userCoins !== undefined 
            ? `${systemMessage}\n用户硬币数量: ${userCoins}`
            : systemMessage;

        // 构建完整的对话消息数组
        const messages = [
            { role: "system", content: systemMessageWithCoins },
            ...history,
            { role: "user", content: message }
        ];

        let aiResponse;
        let aiProvider = 'none';

        // 首先尝试使用Gemini API（如果已配置并启用）
        if (isGeminiConfigured()) {
            try {
                aiResponse = await processWithGemini(messages);
                aiProvider = 'gemini';
            } catch (geminiError) {
                logger.warn(`Gemini API调用失败，尝试回退到Azure OpenAI: ${geminiError.message || '未知错误'}`);
                // 回退到Azure（如果已配置）
                if (isAzureConfigured()) {
                    try {
                        aiResponse = await processWithAzure(messages);
                        aiProvider = 'azure';
                    } catch (azureError) {
                        logger.error(`Azure OpenAI回退也失败: ${azureError.message || '未知错误'}`);
                        // 两个AI都失败，返回错误消息
                        return {
                            response: "抱歉，AI服务暂时不可用，请稍后再试。",
                            timestamp: new Date().toISOString(),
                            provider: 'none',
                            error: true
                        };
                    }
                } else {
                    logger.error('Gemini API失败且Azure未配置，返回错误消息');
                    // 返回错误消息而不是模拟响应
                    return {
                        response: "抱歉，AI服务暂时不可用，请稍后再试。",
                        timestamp: new Date().toISOString(),
                        provider: 'none',
                        error: true
                    };
                }
            }
        } 
        // 如果Gemini未配置，尝试使用Azure
        else if (isAzureConfigured()) {
            try {
                aiResponse = await processWithAzure(messages);
                aiProvider = 'azure';
            } catch (azureError) {
                logger.error(`Azure OpenAI调用失败: ${azureError.message || '未知错误'}`);
                // 返回错误消息而不是模拟响应
                return {
                    response: "抱歉，AI服务暂时不可用，请稍后再试。",
                    timestamp: new Date().toISOString(),
                    provider: 'none',
                    error: true
                };
            }
        } 
        // 如果两个API都未配置，也返回错误消息
        else {
            logger.info('未配置任何AI API，返回错误消息');
            return {
                response: "抱歉，AI服务尚未配置，请联系管理员。",
                timestamp: new Date().toISOString(),
                provider: 'none',
                error: true
            };
        }

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
            timestamp: new Date().toISOString(),
            provider: aiProvider
        };
    } catch (error) {
        // 记录更详细的错误信息
        let errorMessage = `AI服务错误: ${error && error.message ? error.message : String(error)}\n`;
        errorMessage += `错误详情: ${error && error.stack ? error.stack : JSON.stringify(error)}\n`;
        
        // 如果有详细错误信息，记录它
        if (error.response) {
            errorMessage += `API 响应错误: ${JSON.stringify(error.response.data || error.response)}`;
        }
        
        logger.error(errorMessage);
        
        // 所有方法都失败，返回错误消息而不是模拟响应
        return {
            response: "抱歉，AI服务发生意外错误，请稍后再试。",
            timestamp: new Date().toISOString(),
            provider: 'none',
            error: true
        };
    }
}

module.exports = {
    processChat,
    isAzureConfigured,
    isGeminiConfigured,
    sanitizeForDisplay
};