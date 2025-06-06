const winston = require('winston');
const fs = require('fs');
const config = require('../config');

// 确保日志目录存在
if (!fs.existsSync(config.logging.logDir)) {
    fs.mkdirSync(config.logging.logDir, { recursive: true });
}

// 创建日志记录器
const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ 
            filename: `${config.logging.logDir}/server.log`, 
            maxsize: config.logging.maxLogSize, 
            maxFiles: config.logging.maxLogFiles 
        }),
        new winston.transports.Console()
    ]
});

// 写入对话历史日志
function writeHistoryLog(sessionId, history) {
    if (sessionId === 'unknown') return;
    
    const historyLogPath = `${config.logging.logDir}/history-${sessionId}.log`;
    const historyLogEntry = `\n[${new Date().toISOString()}]\n${JSON.stringify(history, null, 2)}\n`;
    
    fs.appendFile(historyLogPath, historyLogEntry, err => {
        if (err) logger.error('写入对话历史日志失败:', err);
    });
}

// 替换console.log/console.error为logger
function setupConsoleOverride() {
    console.log = (...args) => logger.info(args.join(' '));
    console.error = (...args) => logger.error(args.join(' '));
}

module.exports = {
    logger,
    writeHistoryLog,
    setupConsoleOverride
}; 