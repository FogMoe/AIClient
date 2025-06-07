// 错误处理工具函数
const path = require('path');

/**
 * 处理不同类型的错误响应
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {number} statusCode - HTTP状态码
 * @param {string} errorType - 错误类型
 * @param {string} message - 错误消息
 */
function handleError(req, res, statusCode = 500, errorType = 'server_error', message = null) {
    // 如果是API请求，返回JSON
    if (req.originalUrl.startsWith('/api/')) {
        const errorMessages = {
            400: '请求错误',
            401: '未授权访问',
            403: '访问被禁止',
            404: '接口不存在',
            500: '服务器内部错误',
            502: '网关错误',
            503: '服务不可用'
        };

        res.status(statusCode).json({
            success: false,
            error: message || errorMessages[statusCode] || '未知错误',
            timestamp: new Date().toISOString()
        });
    } else {
        // 页面请求重定向到错误页面
        res.redirect(`/error?code=${statusCode}&type=${errorType}`);
    }
}

/**
 * 发送错误页面
 * @param {Object} res - Express响应对象
 * @param {number} statusCode - HTTP状态码
 */
function sendErrorPage(res, statusCode = 404) {
    res.status(statusCode).sendFile(path.join(__dirname, '..', 'public', 'error.html'));
}

/**
 * 处理未授权访问
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function handleUnauthorized(req, res) {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(401).json({
            success: false,
            message: '请先登录',
            redirectUrl: '/auth/login'
        });
    } else {
        // 对于页面请求，直接重定向到登录页面
        res.redirect('/auth/login');
    }
}

/**
 * 处理禁止访问
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function handleForbidden(req, res) {
    handleError(req, res, 403, 'forbidden', '您没有权限访问此页面');
}

/**
 * 处理404错误
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function handleNotFound(req, res) {
    handleError(req, res, 404, 'not_found', '页面或资源不存在');
}

/**
 * 处理服务器错误
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Error} error - 错误对象
 */
function handleServerError(req, res, error = null) {
    if (error) {
        console.error('服务器错误:', error);
    }
    handleError(req, res, 500, 'server_error', '服务器遇到了一个错误');
}

module.exports = {
    handleError,
    sendErrorPage,
    handleUnauthorized,
    handleForbidden,
    handleNotFound,
    handleServerError
};
