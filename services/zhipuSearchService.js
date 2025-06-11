const axios = require('axios');
const { logger } = require('../utils/logger');
const config = require('../config');

/**
 * 使用智谱AI Web Search API执行网页搜索
 * @param {string} query - 要搜索的关键词或短语
 * @returns {Promise<string>} - 格式化的搜索结果字符串
 */
async function webSearch(query) {
    if (!query || typeof query !== 'string') {
        const result = '搜索关键词无效';
        logger.info(`返回给AI的内容: ${JSON.stringify(result)}`);
        return result;
    }

    try {
        // 检查智谱AI配置
        if (!config.zhipuAI.enabled) {
            const result = '智谱AI搜索服务未启用';
            logger.warn(result);
            logger.info(`返回给AI的内容: ${JSON.stringify(result)}`);
            return result;
        }

        const apiKey = config.zhipuAI.apiKey;
        
        if (apiKey === "<REPLACE_WITH_YOUR_ZHIPU_API_KEY>" || !apiKey) {
            const result = '智谱AI API密钥未配置';
            logger.warn(result);
            logger.info(`返回给AI的内容: ${JSON.stringify(result)}`);
            return result;
        }

        const url = config.zhipuAI.baseURL;
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        const requestData = {
            search_query: query,
            search_engine: config.zhipuAI.searchEngine,
            search_intent: false, // 跳过搜索意图识别，直接执行搜索
            count: config.zhipuAI.maxResults,
            content_size: config.zhipuAI.contentSize
        };

        logger.info(`开始搜索: ${query}`);
        logger.debug(`请求数据: ${JSON.stringify(requestData)}`);

        const response = await axios.post(url, requestData, {
            headers: headers,
            timeout: 15000 // 15秒超时
        });

        const data = response.data;
        logger.debug(`智谱AI搜索响应: ${JSON.stringify(data)}`);

        if (!data || !data.search_result || !Array.isArray(data.search_result)) {
            const result = '搜索API返回数据格式异常';
            logger.warn(result);
            logger.info(`返回给AI的内容: ${JSON.stringify(result)}`);
            return result;
        }

        const searchResults = data.search_result;
        
        if (searchResults.length === 0) {
            const result = '未找到相关搜索结果';
            logger.info(`搜索"${query}"无结果`);
            logger.info(`返回给AI的内容: ${JSON.stringify(result)}`);
            return result;
        }

        // 格式化搜索结果
        const formattedResults = searchResults.map((item, index) => {
            const title = item.title || '无标题';
            const content = item.content || '无内容摘要';
            const link = item.link || '';
            const media = item.media || '';
            const publishDate = item.publish_date || '';
            
            let resultText = `${index + 1}. ${title}`;
            if (content) {
                resultText += `\n   摘要: ${content}`;
            }
            if (link) {
                resultText += `\n   链接: ${link}`;
            }
            if (media) {
                resultText += `\n   来源: ${media}`;
            }
            if (publishDate) {
                resultText += `\n   发布时间: ${publishDate}`;
            }
            
            return resultText;
        });

        const finalResult = formattedResults.join('\n\n');
        logger.info(`搜索"${query}"成功，返回${searchResults.length}条结果`);
        logger.info(`返回给AI的内容: ${JSON.stringify(finalResult)}`);
        
        return finalResult;

    } catch (error) {
        let errMsg;
        
        if (error.response) {
            // API返回了错误响应
            const status = error.response.status;
            const errorData = error.response.data;
            errMsg = `智谱AI搜索API错误 (${status}): ${JSON.stringify(errorData)}`;
        } else if (error.request) {
            // 请求发送了但没有收到响应
            errMsg = `智谱AI搜索API网络错误: ${error.message}`;
        } else {
            // 其他错误
            errMsg = `智谱AI搜索发生错误: ${error.message || String(error)}`;
        }
        
        logger.error(errMsg);
        logger.info(`返回给AI的内容: ${JSON.stringify(errMsg)}`);
        return errMsg;
    }
}

module.exports = {
    webSearch
};