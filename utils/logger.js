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



// 替换console.log/console.error为logger
function setupConsoleOverride() {
    console.log = (...args) => logger.info(args.join(' '));
    console.error = (...args) => logger.error(args.join(' '));
}

module.exports = {
    logger,
    setupConsoleOverride
};