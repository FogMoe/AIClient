const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

// 内存缓存
const chatHistoryCache = new Map();
const CACHE_DURATION = 60000; // 增加到60秒缓存，提高可用性

// 定期清理过期缓存（每5分钟执行一次）
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of chatHistoryCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            chatHistoryCache.delete(key);
        }
    }
}, 5 * 60 * 1000);

// 数据库连接配置
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,         // 从10增加到20
    queueLimit: 0,
    connectTimeout: 15000,       // 添加连接超时时间：15秒
    // 注意：mysql2 的 Connection 对象不识别 acquireTimeout/timeout 参数，
    // 否则会出现 "Ignoring invalid configuration option passed to Connection" 报警。
    // 如需控制获取连接或单条查询的超时，请分别在 createPool 级别或 execute 调用时传入。
};

// 创建连接池
let pool = mysql.createPool(dbConfig);

// 监听错误事件
pool.on('error', (err) => {
    logger.error('数据库连接池错误:', err.message || err);
    logger.error('错误详情:', err.stack || JSON.stringify(err));
    logger.error('错误类型:', err.name || '未知错误类型');
    logger.error('错误代码:', err.code || '无错误代码');
});

// 连接池健康检查（每5分钟）
setInterval(async () => {
    try {
        await pool.query('SELECT 1');
        logger.info('数据库连接池健康检查通过');
    } catch (error) {
        logger.error('数据库连接池健康检查失败:', error.message || error);
        logger.error('尝试重新创建连接池');
        try {
            // 释放旧连接池资源（如果可能）
            await pool.end().catch(() => {});
            // 重新创建连接池
            pool = mysql.createPool(dbConfig);
            logger.info('数据库连接池已重新创建');
        } catch (recreateError) {
            logger.error('重新创建连接池失败:', recreateError.message || recreateError);
        }
    }
}, 5 * 60 * 1000);

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        logger.info('数据库连接成功');
        connection.release();
        return true;
    } catch (error) {
        logger.error('数据库连接失败:', error.message);
        return false;
    }
}

// 删除聊天记录
async function deleteChatHistory(conversationId) {
    try {
        // 确保conversationId是数字类型
        const numericConversationId = parseInt(conversationId, 10);
        if (isNaN(numericConversationId)) {
            logger.error('无效的对话ID:', conversationId);
            throw new Error('无效的对话ID');
        }
        
        // 清除缓存
        const cacheKey = `chat_${numericConversationId}`;
        chatHistoryCache.delete(cacheKey);

        const sql = 'DELETE FROM chat_records WHERE conversation_id = ?';
        const [result] = await pool.execute(sql, [numericConversationId]);

        if (result.affectedRows > 0) {
            logger.info(`聊天记录已删除，conversation_id: ${numericConversationId}`);
            return true;
        } else {
            logger.warn(`尝试删除聊天记录，但未找到匹配的记录，conversation_id: ${numericConversationId}`);
            return false; // 未找到记录或未删除任何行
        }
    } catch (error) {
        logger.error('删除聊天记录失败:', error);
        logger.error('错误详情:', error.stack);
        throw error;
    }
}

// 带重试的查询执行
async function queryWithRetry(sql, params = [], maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const [rows] = await pool.execute(sql, params);
            if (attempt > 1) {
                logger.info(`查询在第${attempt}次尝试成功`);
            }
            return rows;
        } catch (error) {
            lastError = error;
            // 如果是超时或连接错误，尝试重试
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
                logger.warn(`查询失败(${error.code})，正在进行第${attempt}/${maxRetries}次重试:`, error.message);
                // 延迟重试，避免立即重试造成连接风暴
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            } else {
                // 非网络错误直接抛出
                throw error;
            }
        }
    }
    // 所有重试都失败
    logger.error(`查询失败，已重试${maxRetries}次:`, lastError.message || lastError);
    throw lastError;
}

// 执行查询
async function query(sql, params = []) {
    try {
        return await queryWithRetry(sql, params, 3);
    } catch (error) {
        logger.error('数据库查询错误:', error.message || error);
        logger.error('查询SQL:', sql);
        logger.error('查询参数:', JSON.stringify(params));
        logger.error('错误详情:', error.stack || JSON.stringify(error));
        logger.error('错误类型:', error.name || '未知错误类型');
        logger.error('错误代码:', error.code || '无错误代码');
        throw error;
    }
}

// 获取用户信息（通过user_id）
async function getUserById(userId) {
    const sql = `
        SELECT u.id, u.name, u.coins, u.permission, u.info 
        FROM user u 
        WHERE u.id = ?
    `;
    const users = await query(sql, [userId]);
    return users.length > 0 ? users[0] : null;
}

// 验证用户登录
async function validateLogin(userIdOrName, password) {
    // 首先尝试用户ID登录
    let sql = `
        SELECT wp.user_id, wp.password, u.name 
        FROM web_password wp 
        JOIN user u ON wp.user_id = u.id 
        WHERE wp.user_id = ? AND wp.password = ?
    `;
    let users = await query(sql, [userIdOrName, password]);
    
    // 如果用户ID登录失败，尝试用户名登录
    if (users.length === 0) {
        sql = `
            SELECT wp.user_id, wp.password, u.name 
            FROM web_password wp 
            JOIN user u ON wp.user_id = u.id 
            WHERE u.name = ? AND wp.password = ?
        `;
        users = await query(sql, [userIdOrName, password]);
    }
    
    return users.length > 0 ? users[0] : null;
}

// 获取用户聊天历史记录
async function getChatHistory(userId) {
    try {
        // 确保userId是数字类型
        const conversationId = parseInt(userId, 10);
        if (isNaN(conversationId)) {
            logger.error('无效的用户ID:', userId);
            return null;
        }
        
        // 检查缓存
        const cacheKey = `chat_${conversationId}`;
        const cached = chatHistoryCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            logger.info(`从缓存获取聊天历史，conversation_id: ${conversationId}`);
            return cached.data;
        }
        
        // 使用带重试的查询
        const rows = await queryWithRetry(
            'SELECT messages, timestamp FROM chat_records WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 1',
            [conversationId],
            3
        );
        
        if (rows && rows.length > 0) {
            let messages = [];
            try {
                // 尝试解析数据库中的JSON
                messages = typeof rows[0].messages === 'string' ? 
                    JSON.parse(rows[0].messages) : rows[0].messages;
            } catch (error) {
                logger.error('解析聊天记录JSON失败:', error.message || error);
                // 如果解析失败，返回空数组
                messages = [];
            }
            
            // 过滤掉测试消息（ping-pong等）
            const filteredMessages = Array.isArray(messages) ? messages.filter(msg => {
                if (msg && msg.content) {
                    const content = msg.content.toLowerCase().trim();
                    // 过滤ping-pong测试消息
                    if (content === 'ping' || content === 'pong') {
                        return false;
                    }
                    return true;
                }
                return false; // 如果msg或msg.content为空，则过滤掉此消息
            }) : [];
            
            const result = {
                messages: filteredMessages,
                timestamp: rows[0].timestamp
            };
            
            // 更新缓存
            chatHistoryCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            logger.info(`聊天历史记录获取成功，conversation_id: ${conversationId}, 消息数量: ${filteredMessages.length}`);
            return result;
        }
        
        return null;
    } catch (error) {
        logger.error('获取聊天历史记录失败:', error.message || error);
        logger.error('错误详情:', error.stack || JSON.stringify(error));
        logger.error('错误类型:', error.name || '未知错误类型');
        logger.error('错误代码:', error.code || '无错误代码');
        // 如果出错，返回null而不是抛出异常，提高应用稳定性
        return null;
    }
}

// 保存聊天记录
async function saveChatHistory(conversationId, newMessages) {
    try {
        // 确保conversationId是数字类型
        const numericConversationId = parseInt(conversationId, 10);
        if (isNaN(numericConversationId)) {
            logger.error('无效的对话ID:', conversationId);
            throw new Error('无效的对话ID');
        }
        
        // 验证新消息格式
        if (!Array.isArray(newMessages) || newMessages.length === 0) {
            logger.error('无效的消息格式:', newMessages);
            throw new Error('无效的消息格式');
        }
        
        // 清除缓存
        const cacheKey = `chat_${numericConversationId}`;
        chatHistoryCache.delete(cacheKey);
        
        // 先获取现有的完整聊天记录
        const existingHistoryRecord = await getChatHistory(numericConversationId);
        const existingHistory = existingHistoryRecord ? existingHistoryRecord.messages : [];
        
        // 将新消息追加到现有历史记录中
        const allMessages = [...existingHistory, ...newMessages];
        
        // 计算所有消息的总字符数
        const totalCharacters = allMessages.reduce((total, message) => {
            return total + (message.content ? message.content.length : 0);
        }, 0);
        
        // 如果总字符数超过800000，清空历史记录，只保留新消息
        let messagesToSave = allMessages;
        if (totalCharacters > 800000) {
            logger.warn(`用户 ${numericConversationId} 的聊天记录超过800000字符(${totalCharacters}字符)，自动清空历史记录`);
            messagesToSave = newMessages; // 只保留当前新消息
            
            // 先删除现有记录
            await deleteChatHistory(numericConversationId);
        }
        
        // 检查是否存在记录
        const checkSql = 'SELECT id FROM chat_records WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 1';
        const existingRecords = await query(checkSql, [numericConversationId]);
        
        let result = null;
        
        if (existingRecords.length > 0 && totalCharacters <= 800000) {
            // 更新现有记录（仅当未超过字符限制时）
            const updateSql = `
                UPDATE chat_records 
                SET messages = ?, timestamp = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            result = await query(updateSql, [JSON.stringify(messagesToSave), existingRecords[0].id]);
            logger.info(`聊天记录已更新，conversation_id: ${numericConversationId}, 总消息数量: ${messagesToSave.length}, 总字符数: ${totalCharacters}`);
        } else {
            // 插入新记录（新用户或已清空历史记录）
            const insertSql = `
                INSERT INTO chat_records (conversation_id, messages) 
                VALUES (?, ?)
            `;
            result = await query(insertSql, [numericConversationId, JSON.stringify(messagesToSave)]);
            const newTotalChars = messagesToSave.reduce((total, message) => total + (message.content ? message.content.length : 0), 0);
            logger.info(`聊天记录已创建，conversation_id: ${numericConversationId}, 总消息数量: ${messagesToSave.length}, 总字符数: ${newTotalChars}`);
        }
        
        // 更新缓存
        const updatedData = {
            messages: messagesToSave,
            timestamp: new Date()
        };
        
        chatHistoryCache.set(cacheKey, {
            data: updatedData,
            timestamp: Date.now()
        });
        
        return result;
    } catch (error) {
        logger.error('保存聊天记录失败:', error);
        logger.error('错误详情:', error.stack);
        throw error;
    }
}

// 更新用户金币
async function updateUserCoins(userId, amount) {
    try {
        // 确保userId是数字类型
        const numericUserId = parseInt(userId, 10);
        if (isNaN(numericUserId)) {
            logger.error('更新金币失败：无效的用户ID:', userId);
            return false;
        }
        
        // 获取当前用户信息
        const user = await getUserById(numericUserId);
        if (!user) {
            logger.error('更新金币失败：找不到用户:', numericUserId);
            return false;
        }
        
        // 计算新的金币数量（不能小于0）
        const newCoins = Math.max(0, user.coins + amount);
        
        // 更新金币
        const updateSql = `
            UPDATE user 
            SET coins = ? 
            WHERE id = ?
        `;
        await query(updateSql, [newCoins, numericUserId]);
        
        logger.info(`用户 ${numericUserId} 金币已更新，变动: ${amount}, 当前总量: ${newCoins}`);
        return {success: true, newCoins};
    } catch (error) {
        logger.error('更新用户金币失败:', error);
        return false;
    }
}

// ========================== 站内注册相关 ================================
// 检查用户名是否已存在
async function isUsernameTaken(username) {
    const rows = await query('SELECT id FROM user WHERE name = ?', [username]);
    return rows.length > 0;
}

// 为站内账号分配新的唯一ID（与Telegram UID段错开）
async function generateWebUserId() {
    // 预留的站内账号ID起始段，可通过环境变量覆盖
    const OFFSET_STR = process.env.LOCAL_USER_ID_OFFSET || '8000000000000000';
    const OFFSET = BigInt(OFFSET_STR);

    // 获取当前段内的最大ID
    const rows = await query('SELECT MAX(id) AS maxId FROM user WHERE id >= ?', [OFFSET_STR]);
    if (rows.length === 0 || rows[0].maxId === null) {
        return OFFSET.toString();
    }
    // 在 BigInt 范围内加1
    const nextId = BigInt(rows[0].maxId) + 1n;
    return nextId.toString();
}

// 创建站内用户 (provider = 'web')
async function createWebUser(username, hashedPassword) {
    // 事务，确保user 与 web_password 同时写入
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const newId = await generateWebUserId();

        // 插入 user 表，站内账号默认赠送 10 枚金币
        await conn.query(
            'INSERT INTO user (id, name, provider, coins) VALUES (?, ?, \'web\', 10)',
            [newId, username]
        );

        // 插入 web_password 表
        await conn.query(
            'INSERT INTO web_password (user_id, password) VALUES (?, ?)',
            [newId, hashedPassword]
        );

        await conn.commit();
        return newId;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// ========================== 抽奖相关 ================================
async function getLastLotteryDraw(userId) {
    // 返回UTC时间戳（秒）
    const rows = await query('SELECT UNIX_TIMESTAMP(last_lottery_date) AS ts FROM user_lottery WHERE user_id = ?', [userId]);
    return rows.length ? rows[0].ts : null; // 秒级
}

async function canDrawLottery(userId) {
    const lastTs = await getLastLotteryDraw(userId); // 秒
    const intervalSec = 24 * 60 * 60; // 24h
    if (!lastTs) return { canDraw: true, remaining: 0 };
    const nowSec = Math.floor(Date.now() / 1000);
    const diff = nowSec - lastTs;
    if (diff >= intervalSec) return { canDraw: true, remaining: 0 };
    return { canDraw: false, remaining: (intervalSec - diff) * 1000 };
}

async function recordLotteryDraw(userId) {
    await query(
        'INSERT INTO user_lottery (user_id, last_lottery_date) VALUES (?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE last_lottery_date = UTC_TIMESTAMP()',
        [userId]
    );
}

module.exports = {
    pool,
    query,
    testConnection,
    getUserById,
    validateLogin,
    getChatHistory,
    saveChatHistory,
    deleteChatHistory,
    updateUserCoins,
    isUsernameTaken,
    createWebUser,
    canDrawLottery,
    recordLotteryDraw
};