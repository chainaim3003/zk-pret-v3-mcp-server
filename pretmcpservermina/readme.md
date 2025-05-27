# ZK-PRET MCP Server for Mina Protocol

A comprehensive Model Context Protocol (MCP) server that enables Claude and other AI assistants to interact with ZK-PRET (Zero-Knowledge Privacy-Preserving Real-world Evidence Tokenization) smart contracts on the Mina blockchain.

## 🌟 Features

### Core Capabilities
- **Multi-Level Compliance Verification**: Local, export-import corridors, and global LEI compliance
- **GLEIF Integration**: Legal Entity Identifier verification using GLEIF standards
- **Export-Import Verification**: Trade compliance verification for international commerce
- **BPMN 2.0 Process Verification**: Business process integrity verification
- **ACTUS Risk Assessment**: Financial contract risk and liquidity verification using ACTUS framework
- **Data Integrity Verification**: Document integrity using DCSA standards for maritime trade

### MCP Server Features
- **Dual Transport Support**: STDIO (for Claude Desktop) and SSE (for web integrations)
- **Multi-Network Support**: Local, Devnet, Testnet, and Mainnet deployment
- **Wallet Integration**: Private key and browser wallet support
- **Comprehensive Testing**: Full integration with ZK-PRET test suite
- **Real-time Monitoring**: Health checks, metrics, and logging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Docker (for ACTUS server integration)
- Mina Protocol knowledge
- Claude Desktop (for MCP integration)

### Installation

1. **Clone and Install**
```bash
git clone https://github.com/chainaimlabs/zkpret-mcp-server-mina.git
cd zkpret-mcp-server-mina
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Generate Wallet Keys** (if using private key wallet)
```bash
npm run generate:keys
```

4. **Build the Project**
```bash
npm run build
```

### Configuration

#### Environment Variables
Key environment variables to configure in `.env`:

```bash
# Basic Configuration
MINA_NETWORK=devnet                    # local, devnet, testnet, mainnet
MCP_TRANSPORT=stdio                    # stdio (Claude Desktop) or sse (Web API)
WALLET_TYPE=private_key                # private_key or browser
MINA_PRIVATE_KEY=EKE...               # Your Base58 encoded private key

# SSE Server (if using web integration)
SSE_PORT=3001
SSE_HOST=localhost
CORS_ORIGIN=*

# External Services
GLEIF_API_URL=https://api.gleif.org/api/v1
ACTUS_SERVER_URL=http://98.84.165.146:8083
```

## 🔧 Usage

### Starting the Server

#### For Claude Desktop (STDIO)
```bash
npm run start:stdio
```

#### For Web Integration (SSE)
```bash
npm run start:sse
```

#### Auto-detection Mode
```bash
npm start
# Automatically detects the appropriate transport
```

### Claude Desktop Integration

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "zkpret-mcp-server-mina": {
      "command": "node",
      "args": ["/path/to/zkpret-mcp-server-mina/build/stdio-server.js"],
      "env": {
        "MINA_NETWORK": "devnet",
        "MINA_PRIVATE_KEY": "your-private-key-here"
      }
    }
  }
}
```

## 🛠️ Available MCP Tools

### Contract Management
- `contract_deploy` - Deploy ZK-PRET smart contracts
- `contract_compile` - Compile contracts and generate verification keys
- `contract_get_state` - Get current contract state
- `contract_call_method` - Call contract methods
- `contract_list_deployed` - List all deployed contracts

### Compliance Verification
- `compliance_verify` - Multi-level compliance verification
- `compliance_verify_jurisdiction` - Jurisdiction-specific compliance
- `compliance_verify_multi_level` - Complete 3-level compliance stack

### GLEIF Integration
- `gleif_verify` - Verify Legal Entity Identifier
- `gleif_get_data` - Retrieve GLEIF entity data
- `gleif_verify_registration` - Verify entity registration status

### Export-Import Verification
- `exim_verify` - Export-import compliance verification
- `exim_verify_trade` - Trade transaction verification
- `exim_get_compliance_status` - Get compliance status

### BPMN Process Verification
- `bpmn_verify_process` - Verify business process integrity
- `bpmn_validate` - Validate BPMN 2.0 model structure
- `bpmn_compare_processes` - Compare expected vs actual processes

### ACTUS Risk Assessment
- `actus_verify_risk` - Risk and liquidity verification
- `actus_calculate_risk` - Calculate risk metrics
- `actus_verify_basel3` - Basel III compliance verification

### Data Integrity
- `data_integrity_verify` - Verify document integrity
- `data_integrity_dcsa` - DCSA standard verification
- `data_integrity_hash` - Generate integrity hashes

### Testing
- `test_run_suite` - Run complete test suite
- `test_run_single` - Run individual tests
- `test_run_zkpret_original` - Run original ZK-PRET tests
- `test_get_results` - Get test results and reports

### Wallet Management
- `wallet_get_info` - Get wallet information
- `wallet_switch_network` - Switch networks
- `wallet_get_balance` - Get account balance
- `wallet_sign_message` - Sign messages

### Utilities
- `utility_generate_proof` - Generate zero-knowledge proofs
- `utility_verify_proof` - Verify zero-knowledge proofs
- `utility_format_data` - Format data for contracts
- `utility_validate_input` - Validate input schemas

## 📋 Example Usage with Claude

### Deploy a Compliance Contract
```
Please deploy a compliance contract to devnet with compliance level 3 (global LEI) and set up the initial registry.
```

### Verify Trade Compliance
```
I need to verify trade compliance for an export transaction between a US company (LEI: 549300ABCDEF123456789) and a German importer. The trade value is $50,000 for automotive parts.
```

### Run BPMN Process Verification
```
Please verify that our supply chain finance process follows the expected BPMN workflow. Compare the expected process with the actual execution from our latest transaction.
```

### Execute Complete Test Suite
```
Run the full ZK-PRET test suite on devnet and provide a comprehensive report of all test results.
```

## 🏗️ Architecture

### Project Structure
```
pretmcpservermina/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── stdio-server.ts             # STDIO transport server
│   ├── sse-server.ts               # SSE transport server
│   ├── server/                     # MCP server implementation
│   │   ├── zkpret-mcp-server.ts    # Main server class
│   │   ├── tool-registry.ts        # Tool management
│   │   └── tool-handlers/          # Individual tool handlers
│   ├── contracts/                  # ZK-PRET smart contracts
│   ├── services/                   # Business logic services
│   ├── config/                     # Configuration management
│   ├── utils/                      # Utility functions
│   ├── types/                      # TypeScript definitions
│   └── data/                       # Test data files
├── tests/                          # Comprehensive test suite
├── docs/                           # Documentation
├── scripts/                        # Build and deployment scripts
└── config/                         # Network configurations
```

### Smart Contracts
- **ComplianceContract**: Multi-level compliance verification
- **GLEIFContract**: Legal Entity Identifier verification
- **EXIMContract**: Export-import compliance
- **BPMNContract**: Business process verification
- **ActusContract**: Financial risk assessment
- **DataIntegrityContract**: Document integrity verification

### Services Architecture
- **WalletManager**: Multi-wallet support (private key + browser)
- **ContractManager**: Contract deployment and interaction
- **VerificationServices**: Domain-specific verification logic
- **ProofServices**: ZK proof generation and verification
- **TestRunner**: Automated testing framework

## 🔒 Security

### Best Practices
- Private keys are never logged or exposed
- Environment-based configuration
- Input validation with Zod schemas
- Rate limiting for API endpoints
- CORS protection for web endpoints
- Secure error handling

### Network Security
- Mainnet operations require explicit confirmation
- Test networks for development and testing
- Transaction signing with proper key management
- Secure communication with external services

## 🧪 Testing

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service integration testing
- **E2E Tests**: Complete workflow testing
- **ZK-PRET Compatibility**: Original test suite integration

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# ZK-PRET original tests
npm run test:zkpret

# With coverage
npm run test:coverage
```

### Test Networks
Tests run on safe networks (local, devnet, testnet) only. Mainnet testing is disabled by default for security.

## 🚀 Deployment

### Local Development
```bash
npm run dev                    # Development mode with hot reload
npm run dev:stdio              # STDIO development mode
npm run dev:sse                # SSE development mode
```

### Production Deployment
```bash
npm run build                  # Build for production
npm run start                  # Start production server
```

### Docker Deployment
```bash
npm run docker:build          # Build Docker image
npm run docker:run            # Run container
npm run docker:compose        # Full stack with dependencies
```

### Contract Deployment
```bash
npm run deploy:devnet          # Deploy to devnet
npm run deploy:testnet         # Deploy to testnet
npm run deploy:mainnet         # Deploy to mainnet (with confirmation)
```

## 📚 API Documentation

### HTTP API (SSE Mode)
When running in SSE mode, additional HTTP endpoints are available:

- `GET /health` - Health check
- `GET /status` - Server status with wallet info
- `GET /network` - Network configuration
- `GET /tools` - Available MCP tools
- `GET /contracts` - Deployed contracts
- `POST /message` - SSE endpoint for MCP communication

### MCP Protocol
The server implements the full MCP specification:
- **Tools**: Contract interaction and verification tools
- **Resources**: Access to test data and documentation
- **Prompts**: Pre-configured workflows for common tasks

## 🔧 Configuration

### Network Configuration
Each network has specific configuration in `config/networks/`:
- `local.json` - Local Mina node configuration
- `devnet.json` - Devnet configuration
- `testnet.json` - Testnet configuration
- `mainnet.json` - Mainnet configuration

### Contract Configuration
Contract-specific settings in `config/contracts/`:
- Deployment parameters
- Initialization values
- Gas limits and fees

## 🤝 Integration Examples

### Claude Desktop Example
```json
{
  "mcpServers": {
    "zkpret": {
      "command": "node",
      "args": ["./build/stdio-server.js"],
      "env": {
        "MINA_NETWORK": "devnet",
        "MINA_PRIVATE_KEY": "EKE...",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Web Application Example
```javascript
// Connect to SSE endpoint
const eventSource = new EventSource('http://localhost:3001/message');

// Send MCP request
const response = await fetch('http://localhost:3001/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'contract_deploy',
      arguments: {
        contractType: 'compliance',
        network: 'devnet'
      }
    }
  })
});
```

## 📖 ZK-PRET Integration

### Original Test Suite Compatibility
The MCP server includes full compatibility with the original ZK-PRET test suite:

- `CorporateRegistrationVerificationTestWithSign`
- `EXIMVerificationTestWithSign`
- `GLEIFVerificationTestWithSign`
- `BusinessStandardDataIntegrityVerificationTest`
- `BusinessProcessIntegrityVerificationFileTestWithSign`
- `ComposedRecursive3LevelVerificationTestWithSign`
- `RiskLiquidityACTUSVerifierTest_basel3_Withsign`
- `RiskLiquidityACTUSVerifierTest_adv_zk_WithSign`

### Test Data Integration
All original test data is included:
- Supply Chain Finance BPMN files
- Stablecoin compliance processes
- GLEIF entity test data
- EXIM trade data samples
- ACTUS contract examples

## 🔍 Monitoring and Logging

### Logging
- Structured logging with Winston
- Multiple log levels (error, warn, info, debug, verbose)
- File and console output
- Request/response logging

### Monitoring
- Health check endpoints
- Metrics collection (optional)
- Performance monitoring
- Error tracking

### Debugging
```bash
DEBUG_MODE=true npm run dev     # Enable debug mode
VERBOSE_LOGGING=true npm start  # Verbose logging
LOG_LEVEL=debug npm start       # Debug level logging
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Install dependencies: `npm install`
4. Make changes and add tests
5. Run tests: `npm test`
6. Submit a pull request

### Code Standards
- TypeScript with strict mode
- ESLint and Prettier for formatting
- Jest for testing
- Conventional commits
- 100% test coverage for critical paths

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

### Community
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Discord community for real-time help

### Commercial Support
Contact the ZK-PRET team for enterprise support and custom integrations.

## 🏆 Acknowledgments

- Mina Protocol team for the o1js framework
- ZK-PRET research team for the original implementation
- GLEIF for LEI standards
- ACTUS for financial contract standards
- DCSA for maritime trade standards
- BPMN.org for business process standards

---

**Built with ❤️ for the ZK-PRET and Mina Protocol communities**