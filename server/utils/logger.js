const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'crm-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Security logging
logger.security = (level, message, meta = {}) => {
  logger.log(level, `[SECURITY] ${message}`, {
    ...meta,
    category: 'security',
    timestamp: new Date().toISOString()
  });
};

// API logging
logger.api = (level, message, meta = {}) => {
  logger.log(level, `[API] ${message}`, {
    ...meta,
    category: 'api',
    timestamp: new Date().toISOString()
  });
};

// Database logging
logger.database = (level, message, meta = {}) => {
  logger.log(level, `[DATABASE] ${message}`, {
    ...meta,
    category: 'database',
    timestamp: new Date().toISOString()
  });
};

// User activity logging
logger.userActivity = (userId, action, details = {}) => {
  logger.info(`[USER_ACTIVITY] User ${userId} performed ${action}`, {
    userId,
    action,
    details,
    category: 'user_activity',
    timestamp: new Date().toISOString()
  });
};

// Performance logging
logger.performance = (operation, duration, meta = {}) => {
  logger.info(`[PERFORMANCE] ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...meta,
    category: 'performance',
    timestamp: new Date().toISOString()
  });
};

module.exports = { logger }; 