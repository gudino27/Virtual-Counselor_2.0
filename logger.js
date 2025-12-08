const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : (process.env.LOG_LEVEL || 'info');
};

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] ${info.level}: ${info.message}${info.meta ? ' ' + JSON.stringify(info.meta) : ''}`
  )
);

// JSON format for production/file logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [
  // Console output
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
  }),
];

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  const logsDir = process.env.LOGS_DIR || './logs';

  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create HTTP request logger middleware
const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;

    const meta = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(message, { meta });
    } else if (res.statusCode >= 400) {
      logger.warn(message, { meta });
    } else {
      logger.http(message, { meta });
    }
  });

  next();
};

// Utility method to log with request context
logger.withContext = (req) => ({
  info: (message, meta = {}) => logger.info(message, { meta: { ...meta, requestId: req.id } }),
  warn: (message, meta = {}) => logger.warn(message, { meta: { ...meta, requestId: req.id } }),
  error: (message, meta = {}) => logger.error(message, { meta: { ...meta, requestId: req.id } }),
  debug: (message, meta = {}) => logger.debug(message, { meta: { ...meta, requestId: req.id } }),
});

module.exports = { logger, httpLogger };
