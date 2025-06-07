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
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
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
async function validateLogin(userId, password) {
    const sql = `
        SELECT wp.user_id, wp.password, u.name 
        FROM web_password wp 
        JOIN user u ON wp.user_id = u.id 
        WHERE wp.user_id = ? AND wp.password = ?
    `;
    const users = await query(sql, [userId, password]);
    return users.length > 0 ? users[0] : null;
}

module.exports = {
    pool,
    query,
    testConnection,
    getUserById,
    validateLogin
}; 