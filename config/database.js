const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

// 数据库连接配置
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

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

// 执行查询
async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        logger.error('数据库查询错误:', error.message);
        throw error;
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
        
        const [rows] = await pool.execute(
            'SELECT messages, timestamp FROM chat_records WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 1',
            [conversationId]
        );
        
        if (rows.length > 0) {
            const messages = rows[0].messages;
            
            // 过滤掉测试消息（ping-pong等）
             const filteredMessages = messages.filter(msg => {
                 if (msg && msg.content) {
                     const content = msg.content.toLowerCase().trim();
                     // 过滤ping-pong测试消息
                     if (content === 'ping' || content === 'pong') {
                         return false;
                     }
                     return true;
                 }
                 return false; // 如果msg或msg.content为空，则过滤掉此消息
             });
            
            return {
                messages: filteredMessages,
                timestamp: rows[0].timestamp
            };
        }
        
        return null;
    } catch (error) {
        logger.error('获取聊天历史记录失败:', error);
        logger.error('错误详情:', error.stack);
        throw error;
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

// 保存聊天记录
async function saveChatHistory(conversationId, newMessages) {
    try {
        // 确保conversationId是数字类型
        const numericConversationId = parseInt(conversationId, 10);
        if (isNaN(numericConversationId)) {
            logger.error('无效的对话ID:', conversationId);
            throw new Error('无效的对话ID');
        }
        
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
        
        if (existingRecords.length > 0 && totalCharacters <= 800000) {
            // 更新现有记录（仅当未超过字符限制时）
            const updateSql = `
                UPDATE chat_records 
                SET messages = ?, timestamp = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            await query(updateSql, [JSON.stringify(messagesToSave), existingRecords[0].id]);
            logger.info(`聊天记录已更新，conversation_id: ${numericConversationId}, 总消息数量: ${messagesToSave.length}, 总字符数: ${totalCharacters}`);
        } else {
            // 插入新记录（新用户或已清空历史记录）
            const insertSql = `
                INSERT INTO chat_records (conversation_id, messages) 
                VALUES (?, ?)
            `;
            await query(insertSql, [numericConversationId, JSON.stringify(messagesToSave)]);
            const newTotalChars = messagesToSave.reduce((total, message) => total + (message.content ? message.content.length : 0), 0);
            logger.info(`聊天记录已创建，conversation_id: ${numericConversationId}, 总消息数量: ${messagesToSave.length}, 总字符数: ${newTotalChars}`);
        }
    } catch (error) {
        logger.error('保存聊天记录失败:', error);
        logger.error('错误详情:', error.stack);
        throw error;
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

module.exports = {
    pool,
    query,
    testConnection,
    getUserById,
    validateLogin,
    getChatHistory,
    saveChatHistory,
    deleteChatHistory
};