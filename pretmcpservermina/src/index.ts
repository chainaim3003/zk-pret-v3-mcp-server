import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Note: StreamableHTTPServerTransport may not be available in all SDK versions
// import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { NetworkType, MinaNetworkConfig } from './services/config/network-config.js';
import { WalletManager } from './services/wallet/wallet-manager.js';
import { ZKPretMCPServer } from './server/zkpret-mcp-server.js';

interface ServerOptions {
  transport: 'stdio' | 'sse';
  port?: number;
  network?: NetworkType;
}

function parseArgs(): ServerOptions {
  const args = process.argv.slice(2);
  const options: ServerOptions = {
    transport: 'stdio',
    network: 'testnet'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--transport':
        const transport = args[++i] as 'stdio' | 'sse';
        if (['stdio', 'sse'].includes(transport)) {
          options.transport = transport;
        }
        break;
      case '--port':
        options.port = parseInt(args[++i]);
        break;
      case '--network':
        const network = args[++i] as NetworkType;
        if (['mainnet', 'testnet'].includes(network)) {
          options.network = network;
        }
        break;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  
  // Create network configuration
  const networkConfig: MinaNetworkConfig = {
    type: options.network || 'testnet',
    mina: {
      networkId: options.network === 'mainnet' ? 'mainnet' : 'testnet',
      minaEndpoint: options.network === 'mainnet' 
        ? 'https://proxy.berkeley.minaexplorer.com'
        : 'https://proxy.berkeley.minaexplorer.com',
      archiveEndpoint: options.network === 'mainnet'
        ? 'https://archive.berkeley.minaexplorer.com'
        : 'https://archive.berkeley.minaexplorer.com'
    }
  };

  // Initialize wallet manager without arguments (fix for TS2554)
  const walletManager = new WalletManager();
  
  // Create the ZK-PRET MCP server
  const zkPretServer = new ZKPretMCPServer(networkConfig, walletManager);

  let transport;
  const port = options.port || 3000;

  switch (options.transport) {
    case 'stdio':
      console.log('Starting ZK-PRET MCP Server with STDIO transport...');
      await zkPretServer.startStdio();
      break;
    case 'sse':
      console.log(`Starting ZK-PRET MCP Server with SSE transport on port ${port}...`);
      await zkPretServer.startSSE(port);
      break;
    default:
      throw new Error(`Unsupported transport: ${options.transport}`);
  }
  
  console.log('ZK-PRET MCP Server is running...');
  console.log(`Network: ${networkConfig.type}`);
  console.log(`Transport: ${options.transport}`);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down ZK-PRET MCP Server...');
    await zkPretServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down ZK-PRET MCP Server...');
    await zkPretServer.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error starting ZK-PRET MCP Server:', error);
    process.exit(1);
  });
}