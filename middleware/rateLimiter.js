const config = require('../config');
const { logger } = require('../utils/logger');

// 存储每个session的请求时间戳
const sessionRequestTimes = new Map();

// 清理过期的请求记录
function cleanupExpiredRequests(sessionId) {
    const now = Date.now();
    const requestTimes = sessionRequestTimes.get(sessionId) || [];
    const validTimes = requestTimes.filter(time => (now - time) < config.rateLimit.windowMs);
    sessionRequestTimes.set(sessionId, validTimes);
    return validTimes;
}

// 检查频率限制
function checkRateLimit(sessionId) {
    const validTimes = cleanupExpiredRequests(sessionId);
    return validTimes.length < config.rateLimit.maxRequests;
}

// 记录请求时间
function recordRequest(sessionId) {
    const validTimes = cleanupExpiredRequests(sessionId);
    validTimes.push(Date.now());
    sessionRequestTimes.set(sessionId, validTimes);
}

// 中间件函数
function rateLimitMiddleware(req, res, next) {
    const { sessionId = 'unknown' } = req.body;
    
    if (!checkRateLimit(sessionId)) {
        const validTimes = cleanupExpiredRequests(sessionId);
        const oldestRequestTime = Math.min(...validTimes);
        const timeUntilReset = Math.ceil((config.rateLimit.windowMs - (Date.now() - oldestRequestTime)) / 1000);
        
        logger.info(`会话 ${sessionId} 触发频率限制，剩余等待时间: ${timeUntilReset}秒`);
        
        return res.status(429).json({ 
            error: `您的对话过于频繁，请稍后再试。`,
            rateLimitExceeded: true,
            retryAfter: timeUntilReset,
            timestamp: new Date().toISOString()
        });
    }
    
    // 记录此次请求
    recordRequest(sessionId);
    next();
}

module.exports = {
    rateLimitMiddleware,
    checkRateLimit,
    recordRequest,
    cleanupExpiredRequests
}; 