import { createMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { logger } from '../utils/logger.js';
import * as http from 'http';

export default async function startSSEServer(port: number = 3000) {
  const server = createMcpServer({
    name: 'zkpret-mcp-server-mina',
    version: '1.0.0',
  });

  // Add the same tools as STDIO server
  server.tool('test_connection', {
    description: 'Test the MCP server connection',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', default: 'Hello ZK-PRET!' }
      }
    }
  }, async (args: { message?: string }) => {
    return {
      success: true,
      message: `SSE Server responded: ${args.message || 'Hello ZK-PRET!'}`,
      timestamp: new Date().toISOString()
    };
  });

  server.tool('wallet_get_info', {
    description: 'Get wallet information via SSE',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address' }
      }
    }
  }, async (args: { address?: string }) => {
    return {
      success: true,
      address: args.address || `mina1sse${Math.random().toString(36).substring(2, 10)}`,
      balance: Math.floor(Math.random() * 1000000) / 100,
      network: 'berkeley'
    };
  });

  // Create SSE transport without port parameter
  const transport = new SSEServerTransport('/events');
  await server.connect(transport);

  // Create HTTP server separately
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server: 'ZK-PRET MCP Server',
        version: '1.0.0'
      }));
    } else if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>ZK-PRET MCP Server</title></head>
          <body>
            <h1>ZK-PRET MCP Server</h1>
            <p>Server is running on port ${port}</p>
            <p>Health check: <a href="/health">/health</a></p>
            <p>SSE Events: <a href="/events">/events</a></p>
          </body>
        </html>
      `);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  httpServer.listen(port, () => {
    logger.info(`ZK-PRET MCP SSE Server running on port ${port}`);
  });

  return server;
}