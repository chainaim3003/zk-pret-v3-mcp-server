import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  verbose: 'magenta'
};

// Add colors to winston
winston.addColors(logColors);

// Create logger configuration
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
];

// Add file transports if not in production or if explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  const logDir = process.env.LOG_DIR || './logs';
  
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    })
  );
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Debug log file (only if debug level enabled)
  if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'verbose') {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'debug.log'),
        level: 'debug',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 3
      })
    );
  }
}

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test'
});

// Create child logger for specific components
export function createChildLogger(component: string): winston.Logger {
  return logger.child({ component });
}

// Utility functions for structured logging
export const logUtils = {
  // Log function execution time
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    level: keyof typeof logLevels = 'debug'
  ): Promise<T> {
    const start = Date.now();
    logger.log(level, `Starting ${name}...`);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      logger.log(level, `Completed ${name}`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`Failed ${name}`, { 
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  },

  // Log with context
  withContext(context: Record<string, any>) {
    return {
      error: (message: string, meta?: any) => logger.error(message, { ...context, ...meta }),
      warn: (message: string, meta?: any) => logger.warn(message, { ...context, ...meta }),
      info: (message: string, meta?: any) => logger.info(message, { ...context, ...meta }),
      debug: (message: string, meta?: any) => logger.debug(message, { ...context, ...meta }),
      verbose: (message: string, meta?: any) => logger.verbose(message, { ...context, ...meta })
    };
  },

  // Log HTTP requests
  logRequest(req: any, res: any, duration?: number) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...(duration && { duration: `${duration}ms` })
    };

    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', meta);
    } else {
      logger.info('HTTP Request', meta);
    }
  },

  // Log blockchain transactions
  logTransaction(txHash: string, type: string, status: 'pending' | 'success' | 'failed', meta?: any) {
    const logData = {
      txHash,
      type,
      status,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (status === 'failed') {
      logger.error('Transaction Failed', logData);
    } else if (status === 'success') {
      logger.info('Transaction Success', logData);
    } else {
      logger.info('Transaction Pending', logData);
    }
  },

  // Log contract interactions
  logContract(contractAddress: string, method: string, status: 'success' | 'failed', meta?: any) {
    const logData = {
      contractAddress,
      method,
      status,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (status === 'failed') {
      logger.error('Contract Interaction Failed', logData);
    } else {
      logger.info('Contract Interaction Success', logData);
    }
  },

  // Log proof generation/verification
  logProof(proofType: string, operation: 'generate' | 'verify', status: 'success' | 'failed', meta?: any) {
    const logData = {
      proofType,
      operation,
      status,
      timestamp: new Date().toISOString(),
      ...meta
    };

    if (status === 'failed') {
      logger.error('Proof Operation Failed', logData);
    } else {
      logger.info('Proof Operation Success', logData);
    }
  }
};

// Export default logger
export default logger;