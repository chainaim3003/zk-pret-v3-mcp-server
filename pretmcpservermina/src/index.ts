import { Server, ServerOptions } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from './utils/logger.js';
import { startStdioServer } from '../src/server/stdio-server.js';
import { startSSEServer } from '../src/server/sse-server.js';

interface ServerConfig {
  mode: 'stdio' | 'sse';
  port?: number;
  host?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

function parseArgs(): ServerConfig {
  const args = process.argv.slice(2);
  const config: ServerConfig = {
    mode: 'stdio',
    port: 3000,
    host: 'localhost',
    logLevel: 'info'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mode':
        const mode = args[++i];
        if (mode === 'stdio' || mode === 'sse') {
          config.mode = mode;
        }
        break;
      case '--port':
        config.port = parseInt(args[++i]) || 3000;
        break;
      case '--host':
        config.host = args[++i] || 'localhost';
        break;
      case '--log-level':
        const level = args[++i];
        if (['debug', 'info', 'warn', 'error'].includes(level)) {
          config.logLevel = level as any;
        }
        break;
      case '--help':
        console.log(`
ZK-PRET MCP Server

Usage: zkpret-mcp-server [options]

Options:
  --mode <stdio|sse>    Server mode (default: stdio)
  --port <number>       Port for SSE mode (default: 3000)
  --host <string>       Host for SSE mode (default: localhost)
  --log-level <level>   Log level (default: info)
  --help               Show this help message

Environment Variables:
  MCP_SERVER_MODE      Override mode setting
  PORT                 Override port setting
  LOG_LEVEL           Override log level setting
        `);
        process.exit(0);
    }
  }

  // Environment variable overrides
  if (process.env.MCP_SERVER_MODE) {
    const envMode = process.env.MCP_SERVER_MODE;
    if (envMode === 'stdio' || envMode === 'sse') {
      config.mode = envMode;
    }
  }

  if (process.env.PORT) {
    config.port = parseInt(process.env.PORT) || config.port;
  }

  if (process.env.LOG_LEVEL) {
    const envLevel = process.env.LOG_LEVEL;
    if (['debug', 'info', 'warn', 'error'].includes(envLevel)) {
      config.logLevel = envLevel as any;
    }
  }

  return config;
}

async function main() {
  const config = parseArgs();
  
  // Set log level
  logger.setLevel(config.logLevel);

  try {
    logger.info(`Starting ZK-PRET MCP Server in ${config.mode} mode...`);
    
    if (config.mode === 'sse') {
      await startSSEServer({
        port: config.port!,
        host: config.host!
      });
    } else {
      await startStdioServer();
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in main:', error);
    process.exit(1);
  });
}