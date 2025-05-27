#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import express from 'express';

const app = express();
app.use(express.json());

// Create MCP Server
const server = new McpServer({
  name: 'ZK-PRET MCP Server (SSE)',
  version: '1.0.0'
});

// Test Connection Tool
server.tool(
  'test_connection',
  {
    description: z.string().optional()
  },
  async (args: { description?: string }) => {
    return {
      content: [{
        type: 'text',
        text: `ZK-PRET MCP Server (SSE) is running! ${args.description || 'Connection test successful.'}`
      }]
    };
  }
);

// Contract Deploy Tool
server.tool(
  'contract_deploy',
  {
    contractName: z.string(),
    constructorArgs: z.array(z.string()).optional(),
    networkId: z.enum(['mainnet', 'testnet']).optional()
  },
  async (args: { contractName: string; constructorArgs?: string[]; networkId?: 'mainnet' | 'testnet' }) => {
    try {
      // Simulate contract deployment
      const deploymentResult = {
        contractAddress: `B62q${Math.random().toString(16).substr(2, 48)}`,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        network: args.networkId || 'testnet',
        status: 'deployed'
      };

      return {
        content: [{
          type: 'text',
          text: `Contract ${args.contractName} deployed successfully!\n` +
                `Address: ${deploymentResult.contractAddress}\n` +
                `Transaction: ${deploymentResult.transactionHash}\n` +
                `Network: ${deploymentResult.network}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error deploying contract: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Store transports for session management  
const transports: Record<string, SSEServerTransport> = {};

// SSE endpoint for client connections
app.get('/sse', async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = Math.random().toString(36).substr(2, 9);
    
    // Set up SSE headers first
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Create SSE transport - FIXED: SSEServerTransport requires res parameter
    const transport = new SSEServerTransport('/messages', res);
    transports[sessionId] = transport;

    // Send session ID to client
    res.write(`event: session\ndata: ${sessionId}\n\n`);

    // Connect server to transport
    await server.connect(transport);

    // Handle client disconnect
    req.on('close', () => {
      delete transports[sessionId];
      console.log(`SSE client disconnected: ${sessionId}`);
    });

    req.on('error', (error: Error) => {
      console.error(`SSE connection error for ${sessionId}:`, error);
      delete transports[sessionId];
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(keepAlive);
        delete transports[sessionId];
        return;
      }
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    }, 30000); // Send ping every 30 seconds

    req.on('close', () => {
      clearInterval(keepAlive);
    });

  } catch (error) {
    console.error('Error setting up SSE connection:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Message endpoint for client-to-server communication

app.post('/messages', async (req: any, res: any) => {
//app.post('/messages', async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];

    if (!transport) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Invalid session ID or transport not found'
        },
        id: null
      });
    }

    // Handle the incoming JSON-RPC message
    try {
      // The transport should handle the message processing
      // For now, we'll acknowledge receipt
      res.json({
        jsonrpc: '2.0',
        result: { 
          status: 'received',
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        },
        id: req.body?.id || null
      });

    } catch (messageError) {
      console.error('Error processing message:', messageError);
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Invalid message format'
        },
        id: req.body?.id || null
      });
    }

  } catch (error) {
    console.error('Error handling message:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error'
      },
      id: req.body?.id || null
    });
  }
});

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    server: 'ZK-PRET MCP Server (SSE)',
    version: '1.0.0',
    activeSessions: Object.keys(transports).length,
    timestamp: new Date().toISOString()
  });
});

// CORS middleware for development
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Start the server
async function main() {
  const port = parseInt(process.env.PORT || '3000');
  
  app.listen(port, () => {
    console.log(`ZK-PRET MCP Server (SSE) listening on port ${port}`);
    console.log(`SSE endpoint: http://localhost:${port}/sse`);
    console.log(`Messages endpoint: http://localhost:${port}/messages`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log('Server ready to accept SSE connections');
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error starting SSE server:', error);
    process.exit(1);
  });
}