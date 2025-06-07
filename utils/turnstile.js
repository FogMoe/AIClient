// Turnstile验证工具函数
const config = require('../config');
const { logger } = require('./logger');

/**
 * 验证Turnstile token
 * @param {string} token - Turnstile token
 * @param {string} remoteip - 用户IP地址（可选）
 * @returns {Promise<boolean>} 验证结果
 */
async function verifyTurnstile(token, remoteip = null) {
    if (!config.turnstile.enabled) {
        logger.info('Turnstile验证已禁用，跳过验证');
        return true;
    }

    if (!token) {
        logger.warn('Turnstile token为空');
        return false;
    }

    if (!config.turnstile.secretKey || config.turnstile.secretKey === '<REPLACE_WITH_YOUR_TURNSTILE_SECRET_KEY>') {
        logger.error('Turnstile secret key未配置');
        return false;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('secret', config.turnstile.secretKey);
        formData.append('response', token);
        
        if (remoteip) {
            formData.append('remoteip', remoteip);
        }

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            logger.info('Turnstile验证成功');
            return true;
        } else {
            logger.warn('Turnstile验证失败:', data['error-codes'] || '未知错误');
            return false;
        }
    } catch (error) {
        logger.error('Turnstile验证请求失败:', error.message);
        return false;
    }
}

module.exports = {
    verifyTurnstile
};
