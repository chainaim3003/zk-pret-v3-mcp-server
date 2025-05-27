#!/usr/bin/env node

/**
 * ZK-PRET MCP Server for Mina Protocol
 * Main Entry Point - Auto-detects transport type
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { ZKPRETMCPServer } from './server/zkpret-mcp-server.js';
import { MinaNetworkConfig, NetworkType } from './config/network-config.js';
import { WalletManager } from './services/wallet/wallet-manager.js';
import { AppConfig } from './config/app-config.js';

// Load environment variables
dotenv.config();

interface ServerOptions {
  transport: 'stdio' | 'sse';
  network: NetworkType;
  port?: number;
  host?: string;
}

class ZKPRETMCPServerBootstrap {
  private options: ServerOptions;
  private zkpretServer?: ZKPRETMCPServer;
  private mcpServer?: Server;
  private httpServer?: any;

  constructor(options: ServerOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting ZK-PRET MCP Server...', {
        transport: this.options.transport,
        network: this.options.network,
        version: process.env.npm_package_version || '1.0.0'
      });

      // Initialize configuration
      const networkConfig = MinaNetworkConfig.getConfig(this.options.network);
      const appConfig = AppConfig.getInstance();
      
      // Initialize wallet manager
      const walletManager = new WalletManager(networkConfig);
      await walletManager.initialize();

      // Create MCP server instance
      this.mcpServer = new Server({
        name: 'zkpret-mcp-server-mina',
        version: process.env.npm_package_version || '1.0.0',
      }, {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {}
        }
      });

      // Create ZK-PRET MCP server
      this.zkpretServer = new ZKPRETMCPServer(
        this.mcpServer,
        networkConfig,
        walletManager,
        appConfig
      );
      await this.zkpretServer.initialize();

      // Set up transport
      await this.setupTransport();

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      logger.info('ZK-PRET MCP Server started successfully', {
        transport: this.options.transport,
        network: this.options.network,
        ...(this.options.transport === 'sse' && {
          port: this.options.port,
          host: this.options.host
        })
      });

    } catch (error) {
      logger.error('Failed to start ZK-PRET MCP Server:', error);
      process.exit(1);
    }
  }

  private async setupTransport(): Promise<void> {
    switch (this.options.transport) {
      case 'stdio':
        await this.setupStdioTransport();
        break;
      case 'sse':
        await this.setupSSETransport();
        break;
      default:
        throw new Error(`Unsupported transport type: ${this.options.transport}`);
    }
  }

  private async setupStdioTransport(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer!.connect(transport);
    logger.info('STDIO transport connected');
  }

  private async setupSSETransport(): Promise<void> {
    const port = this.options.port || 3001;
    const host = this.options.host || 'localhost';
    
    // Import express dynamically for SSE mode
    const express = await import('express');
    const cors = await import('cors');
    const helmet = await import('helmet');
    const compression = await import('compression');
    const morgan = await import('morgan');

    const app = express.default();

    // Security middleware
    app.use(helmet.default({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    app.use(cors.default({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Compression and logging
    app.use(compression.default());
    app.use(morgan.default('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        network: this.options.network,
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
      });
    });

    // Status endpoint with wallet info
    app.get('/status', async (req, res) => {
      try {
        const walletInfo = await this.zkpretServer!.getWalletManager().getWalletInfo();
        res.json({
          status: 'running',
          network: this.options.network,
          wallet: {
            address: walletInfo.address,
            balance: walletInfo.balance,
            isConnected: walletInfo.isConnected,
            type: walletInfo.type
          },
          contracts: await this.zkpretServer!.getDeployedContracts(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Status endpoint error:', error);
        res.status(500).json({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Network info endpoint
    app.get('/network', (req, res) => {
      const networkConfig = MinaNetworkConfig.getConfig(this.options.network);
      res.json({
        current: this.options.network,
        config: networkConfig,
        available: Object.keys(MinaNetworkConfig.getAllNetworks())
      });
    });

    // Tools endpoint - list available MCP tools
    app.get('/tools', async (req, res) => {
      try {
        const tools = await this.zkpretServer!.getAvailableTools();
        res.json({
          tools,
          count: tools.length
        });
      } catch (error) {
        logger.error('Tools endpoint error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Contracts endpoint - list deployed contracts
    app.get('/contracts', async (req, res) => {
      try {
        const contracts = await this.zkpretServer!.getDeployedContracts();
        res.json(contracts);
      } catch (error) {
        logger.error('Contracts endpoint error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Error handling middleware
    app.use((err: Error, req: any, res: any, next: any) => {
      logger.error('Express error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });

    // Set up SSE transport
    const transport = new SSEServerTransport('/message', port);
    await this.mcpServer!.connect(transport);

    // Start HTTP server
    this.httpServer = app.listen(port, host, () => {
      logger.info(`HTTP API server started on http://${host}:${port}`);
      logger.info(`Health check: http://${host}:${port}/health`);
      logger.info(`Status: http://${host}:${port}/status`);
      logger.info(`SSE endpoint: http://${host}:${port}/message`);
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down ZK-PRET MCP Server...`);
      
      try {
        // Close HTTP server if running
        if (this.httpServer) {
          await new Promise<void>((resolve, reject) => {
            this.httpServer.close((err: Error | undefined) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // Cleanup ZK-PRET server
        if (this.zkpretServer) {
          await this.zkpretServer.cleanup();
        }

        // Close MCP server
        if (this.mcpServer) {
          await this.mcpServer.close();
        }

        logger.info('ZK-PRET MCP Server shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various termination signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    
    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Auto-detect transport and start server
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const transportArg = args.find(arg => ['stdio', 'sse'].includes(arg));
    const networkArg = args.find(arg => ['local', 'devnet', 'testnet', 'mainnet'].includes(arg));

    // Determine transport type
    let transport: 'stdio' | 'sse';
    if (transportArg) {
      transport = transportArg as 'stdio' | 'sse';
    } else if (process.env.MCP_TRANSPORT) {
      transport = process.env.MCP_TRANSPORT as 'stdio' | 'sse';
    } else {
      // Auto-detect based on environment
      transport = process.stdout.isTTY ? 'stdio' : 'sse';
    }

    // Determine network
    const network = (networkArg || process.env.MINA_NETWORK || 'local') as NetworkType;

    // Additional options for SSE
    const port = parseInt(process.env.SSE_PORT || '3001');
    const host = process.env.SSE_HOST || 'localhost';

    // Create and start server
    const serverBootstrap = new ZKPRETMCPServerBootstrap({
      transport,
      network,
      port,
      host
    });

    await serverBootstrap.start();

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}