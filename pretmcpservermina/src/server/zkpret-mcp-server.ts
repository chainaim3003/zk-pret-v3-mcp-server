import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import express from 'express';

import { NetworkType, MinaNetworkConfig } from '../services/config/network-config.js';
import { WalletManager } from '../services/wallet/wallet-manager.js';
import { ToolRegistry } from './tool-registry.js';
import { logger } from '../utils/logger.js';

// Mock service implementations for compilation
export class MockContractManager {
  async deployContract(name: string, args: string[], network: string) {
    return { 
      address: `0x${Math.random().toString(16).substr(2, 40)}`, 
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}` 
    };
  }
  async callContract(address: string, method: string, args: string[], network: string) {
    return { 
      returnValue: `Mock result for ${method}`, 
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}` 
    };
  }
  async verifyContract(address: string, code: string, args: string[], network: string) {
    return { verified: Math.random() > 0.5, message: 'Mock verification result' };
  }
  async getContractState(address: string, network: string) {
    return { 
      appState: [Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)], 
      nonce: Math.floor(Math.random() * 1000), 
      balance: Math.random() * 10000 
    };
  }
  async compileContract(code: string, name: string, optimize: boolean) {
    return { 
      bytecode: `0x${Math.random().toString(16).substr(2, 200)}`, 
      abi: { methods: ['constructor', 'getValue', 'setValue'] }, 
      compilationTime: Math.floor(Math.random() * 5000) + 1000 
    };
  }
}

export class MockComplianceService {
  async verifyCompliance(entityId: string, type: string, jurisdictions: string[]) {
    return { 
      status: Math.random() > 0.3 ? 'PASSED' : 'FLAGGED', 
      timestamp: new Date().toISOString(),
      details: `Mock compliance check for ${entityId}`
    };
  }
}

export class MockGLEIFService {
  async verifyLEI(lei: string) {
    return { 
      valid: Math.random() > 0.2, 
      entity: `Mock Entity for LEI ${lei}`,
      registrationStatus: 'ISSUED'
    };
  }
}

export class MockEXIMService {
  async verifyExportImport(data: any) {
    return { 
      compliant: Math.random() > 0.3, 
      details: 'Mock export/import verification',
      violations: Math.random() > 0.7 ? ['Documentation incomplete'] : []
    };
  }
}

export class MockBPMNService {
  async verifyProcess(processId: string, definition: string) {
    return { 
      valid: Math.random() > 0.2, 
      issues: Math.random() > 0.6 ? ['Missing start event'] : [],
      processMetrics: { complexity: Math.floor(Math.random() * 10) + 1 }
    };
  }
}

export class MockActusService {
  async verifyBasel3(contractId: string, parameters: any) {
    return { 
      compliant: Math.random() > 0.3, 
      riskScore: Math.random() * 100,
      recommendations: ['Increase capital buffer', 'Review risk parameters']
    };
  }
}

export class MockDataIntegrityService {
  async verifyIntegrity(data: any) {
    return { 
      valid: Math.random() > 0.1, 
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      tampering: Math.random() > 0.9 ? 'DETECTED' : 'NONE'
    };
  }
}

export class MockTestRunner {
  async runTests(suite?: string) {
    const passed = Math.floor(Math.random() * 90) + 10;
    const failed = Math.floor(Math.random() * 10);
    return { 
      passed, 
      failed, 
      duration: Math.floor(Math.random() * 120) + 30,
      coverage: Math.floor(Math.random() * 30) + 70
    };
  }
}

export class MockProofGenerator {
  async generateProof(circuit: string, inputs: any) {
    return { 
      proof: `0x${Math.random().toString(16).substr(2, 256)}`,
      verificationKey: `0x${Math.random().toString(16).substr(2, 128)}`,
      publicSignals: Array.from({length: 3}, () => Math.floor(Math.random() * 1000))
    };
  }
}

export class MockProofVerifier {
  async verifyProof(proof: string, inputs: any) {
    return { 
      valid: Math.random() > 0.1,
      verificationTime: Math.floor(Math.random() * 1000) + 100
    };
  }
}

export type TransportType = StdioServerTransport | SSEServerTransport;

export class ZKPretMCPServer {
  private server: McpServer;
  private toolRegistry: ToolRegistry;
  private isRunning = false;
  private app?: express.Application;

  // Service instances
  private contractManager: MockContractManager;
  private complianceService: MockComplianceService;
  private gleifService: MockGLEIFService;
  private eximService: MockEXIMService;
  private bpmnService: MockBPMNService;
  private actusService: MockActusService;
  private dataIntegrityService: MockDataIntegrityService;
  private testRunner: MockTestRunner;
  private proofGenerator: MockProofGenerator;
  private proofVerifier: MockProofVerifier;

  constructor(
    private networkConfig: MinaNetworkConfig, 
    private walletManager: WalletManager
  ) {
    // Initialize MCP Server
    this.server = new McpServer({
      name: 'ZK-PRET MCP Server',
      version: '1.0.0'
    });

    this.toolRegistry = new ToolRegistry();

    // Initialize services
    this.contractManager = new MockContractManager();
    this.complianceService = new MockComplianceService();
    this.gleifService = new MockGLEIFService();
    this.eximService = new MockEXIMService();
    this.bpmnService = new MockBPMNService();
    this.actusService = new MockActusService();
    this.dataIntegrityService = new MockDataIntegrityService();
    this.testRunner = new MockTestRunner();
    this.proofGenerator = new MockProofGenerator();
    this.proofVerifier = new MockProofVerifier();

    // Set wallet manager network config
    this.walletManager.setNetworkConfig(networkConfig);

    // Initialize all tools
    this.initializeTools();
  }

  private initializeTools(): void {
    logger.info('Initializing ZK-PRET MCP Server tools...');

    // Add all the tools to the MCP server
    this.addContractTools();
    this.addComplianceTools();
    this.addFinancialTools();
    this.addProcessTools();
    this.addDataTools();
    this.addWalletTools();
    this.addProofTools();
    this.addUtilityTools();

    logger.info(`Initialized ${this.toolRegistry.getStats().totalTools} tools across ${this.toolRegistry.getStats().categoriesCount} categories`);
  }

  private addContractTools(): void {
    // Contract deployment tool
    this.server.tool(
      'contract_deploy',
      {
        contractName: z.string(),
        constructorArgs: z.array(z.string()).optional(),
        networkId: z.enum(['mainnet', 'testnet']).optional()
      },
      async (args) => {
        try {
          const result = await this.contractManager.deployContract(
            args.contractName,
            args.constructorArgs || [],
            args.networkId || 'testnet'
          );
          return {
            content: [{
              type: 'text',
              text: `Contract ${args.contractName} deployed!\nAddress: ${result.address}\nTx: ${result.transactionHash}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Deployment failed: ${error}` }],
            isError: true
          };
        }
      }
    );

    // Contract call tool
    this.server.tool(
      'contract_call',
      {
        contractAddress: z.string(),
        methodName: z.string(),
        args: z.array(z.string()).optional()
      },
      async (args) => {
        try {
          const result = await this.contractManager.callContract(
            args.contractAddress,
            args.methodName,
            args.args || [],
            'testnet'
          );
          return {
            content: [{
              type: 'text',
              text: `Method ${args.methodName} called\nResult: ${result.returnValue}\nTx: ${result.transactionHash}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Contract call failed: ${error}` }],
            isError: true
          };
        }
      }
    );

    // Contract state tool
    this.server.tool(
      'contract_get_state',
      {
        contractAddress: z.string()
      },
      async (args) => {
        try {
          const state = await this.contractManager.getContractState(args.contractAddress, 'testnet');
          return {
            content: [{
              type: 'text',
              text: `Contract State:\nAddress: ${args.contractAddress}\nApp State: ${state.appState.join(', ')}\nNonce: ${state.nonce}\nBalance: ${state.balance}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Failed to get state: ${error}` }],
            isError: true
          };
        }
      }
    );
  }

  private addComplianceTools(): void {
    // Multi-level compliance verification
    this.server.tool(
      'compliance_verify_multi_level',
      {
        entityId: z.string(),
        verificationType: z.enum(['KYC', 'AML', 'SANCTIONS', 'PEP']),
        jurisdictions: z.array(z.string()).optional()
      },
      async (args) => {
        try {
          const result = await this.complianceService.verifyCompliance(
            args.entityId,
            args.verificationType,
            args.jurisdictions || ['US', 'EU']
          );
          return {
            content: [{
              type: 'text',
              text: `Compliance Check: ${args.verificationType}\nEntity: ${args.entityId}\nStatus: ${result.status}\nDetails: ${result.details}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Compliance verification failed: ${error}` }],
            isError: true
          };
        }
      }
    );

    // GLEIF verification
    this.server.tool(
      'gleif_verify_lei',
      {
        lei: z.string()
      },
      async (args) => {
        try {
          const result = await this.gleifService.verifyLEI(args.lei);
          return {
            content: [{
              type: 'text',
              text: `LEI Verification\nLEI: ${args.lei}\nValid: ${result.valid}\nEntity: ${result.entity}\nStatus: ${result.registrationStatus}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `LEI verification failed: ${error}` }],
            isError: true
          };
        }
      }
    );
  }

  private addFinancialTools(): void {
    // ACTUS Basel III verification
    this.server.tool(
      'actus_verify_basel3',
      {
        contractId: z.string(),
        riskParameters: z.record(z.number()).optional()
      },
      async (args) => {
        try {
          const result = await this.actusService.verifyBasel3(args.contractId, args.riskParameters);
          return {
            content: [{
              type: 'text',
              text: `Basel III Verification\nContract: ${args.contractId}\nCompliant: ${result.compliant}\nRisk Score: ${result.riskScore.toFixed(2)}\nRecommendations: ${result.recommendations.join(', ')}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Basel III verification failed: ${error}` }],
            isError: true
          };
        }
      }
    );
  }

  private addProcessTools(): void {
    // BPMN process verification
    this.server.tool(
      'bpmn_verify_process',
      {
        processId: z.string(),
        processDefinition: z.string()
      },
      async (args) => {
        try {
          const result = await this.bpmnService.verifyProcess(args.processId, args.processDefinition);
          return {
            content: [{
              type: 'text',
              text: `BPMN Process Verification\nProcess: ${args.processId}\nValid: ${result.valid}\nIssues: ${result.issues.length > 0 ? result.issues.join(', ') : 'None'}\nComplexity: ${result.processMetrics.complexity}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `BPMN verification failed: ${error}` }],
            isError: true
          };
        }
      }
    );
  }

  private addDataTools(): void {
    // Data integrity verification
    this.server.tool(
      'data_integrity_verify',
      {
        data: z.string(),
        expectedHash: z.string().optional()
      },
      async (args) => {
        try {
          const result = await this.dataIntegrityService.verifyIntegrity(args.data);
          return {
            content: [{
              type: 'text',
              text: `Data Integrity Check\nValid: ${result.valid}\nHash: ${result.hash}\nTampering: ${result.tampering}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Data integrity verification failed: ${error}` }],
            isError: true
          };
        }
      }
    );

    // Test runner
    this.server.tool(
      'test_run_all_zkpret',
      {
        testSuite: z.string().optional(),
        includeIntegration: z.boolean().optional()
      },
      async (args) => {
        try {
          const result = await this.testRunner.runTests(args.testSuite);
          return {
            content: [{
              type: 'text',
              text: `Test Results\nSuite: ${args.testSuite || 'all'}\nPassed: ${result.passed}\nFailed: ${result.failed}\nDuration: ${result.duration}s\nCoverage: ${result.coverage}%`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Test execution failed: ${error}` }],
            isError: true
          };
        }
      }
    );
  }

  private addWalletTools(): void {
    // Wallet info tool
    this.server.tool(
      'wallet_get_info',
      {
        address: z.string().optional()
      },
      async (args) => {
        try {
          const walletInfo = await this.walletManager.getWalletInfo(args.address);
          return {
            content: [{
              type: 'text',
              text: `Wallet Information\nAddress: ${walletInfo.address}\nBalance: ${walletInfo.balance.toFixed(6)} MINA\nNonce: ${walletInfo.nonce}\nNetwork: ${walletInfo.network}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Wallet info retrieval failed: ${error}` }],
            isError: true
          };
        }
      }
    );

    // Send transaction tool
    this.server.tool(
      'wallet_send_transaction',
      {
        to: z.string(),
        amount: z.number(),
        memo: z.string().optional()
      },
      async (args) => {
        try {
          const result = await this.walletManager.sendTransaction({
            to: args.to,
            amount: args.amount,
            memo: args.memo
          });
          return {
            content: [{
              type: 'text',
              text: `Transaction Sent\nTo: ${args.to}\nAmount: ${args.amount} MINA\nHash: ${result.hash}\nStatus: ${result.status}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Transaction failed: ${error}` }],
            isError: true
          };
        }
      }
    );
  }

  private addProofTools(): void {
    // ZK proof generation
    this.server.tool(
      'generate_zk_proof',
      {
        circuit: z.string(),
        publicInputs: z.array(z.string()),
        privateInputs: z.array(z.string()).optional()
      },
      async (args) => {
        try {
          const result = await this.proofGenerator.generateProof(args.circuit, {
            public: args.publicInputs,
            private: args.privateInputs || []
          });
          return {
            content: [{
              type: 'text',
              text: `ZK Proof Generated\nCircuit: ${args.circuit}\nProof: ${result.proof.substr(0, 20)}...\nVerification Key: ${result.verificationKey.substr(0, 20)}...\nPublic Signals: ${result.publicSignals.join(', ')}`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Proof generation failed: ${error}` }],
            isError: true
          };
        }
      }
    );

    // ZK proof verification
    this.server.tool(
      'verify_zk_proof',
      {
        proof: z.string(),
        verificationKey: z.string(),
        publicInputs: z.array(z.string())
      },
      async (args) => {
        try {
          const result = await this.proofVerifier.verifyProof(args.proof, {
            verificationKey: args.verificationKey,
            publicInputs: args.publicInputs
          });
          return {
            content: [{
              type: 'text',
              text: `ZK Proof Verification\nValid: ${result.valid}\nVerification Time: ${result.verificationTime}ms`
            }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: `Proof verification failed: ${error}` }],
            isError: true
          };
        }
      }
    );
  }

  private addUtilityTools(): void {
    // Server info tool
    this.server.tool(
      'server_info',
      {},
      async () => {
        const stats = this.toolRegistry.getStats();
        return {
          content: [{
            type: 'text',
            text: `ZK-PRET MCP Server\nVersion: 1.0.0\nNetwork: ${this.networkConfig.type}\nTools: ${stats.totalTools}\nCategories: ${stats.categoriesCount}\nStatus: ${this.isRunning ? 'Running' : 'Stopped'}`
          }]
        };
      }
    );

    // Test connection tool
    this.server.tool(
      'test_connection',
      {
        message: z.string().optional()
      },
      async (args) => {
        return {
          content: [{
            type: 'text',
            text: `ZK-PRET MCP Server Connection Test\nNetwork: ${this.networkConfig.type}\nMessage: ${args.message || 'Connection successful!'}\nTimestamp: ${new Date().toISOString()}`
          }]
        };
      }
    );
  }

  // Transport methods
  public async startStdio(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.isRunning = true;
      logger.info('ZK-PRET MCP Server started with STDIO transport');
    } catch (error) {
      logger.error('Failed to start STDIO server:', error);
      throw error;
    }
  }

  public async startSSE(port: number = 3000): Promise<void> {
    try {
      this.app = express();
      this.app.use(express.json());

      // Store transports for session management
      const transports: Record<string, SSEServerTransport> = {};

      // SSE endpoint
      this.app.get('/sse', async (req: express.Request, res: express.Response) => {
        try {
          const sessionId = Math.random().toString(36).substr(2, 9);
          
          // Set SSE headers first
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
          });

          // Create SSE transport with response object (fixes TS2554)
          const transport = new SSEServerTransport('/messages', res);
          transports[sessionId] = transport;

          // Send session ID
          res.write(`event: session\ndata: ${sessionId}\n\n`);

          // Connect server to transport
          await this.server.connect(transport);

          // Handle disconnect
          req.on('close', () => {
            delete transports[sessionId];
            logger.info(`SSE client disconnected: ${sessionId}`);
          });

        } catch (error) {
          logger.error('SSE connection error:', error);
          res.status(500).send('Internal Server Error');
        }
      });

      // Messages endpoint
       this.app.post('/messages', async (req: any, res: any) => {
      //this.app.post('/messages', async (req: express.Request, res: express.Response) => {
        try {
          const sessionId = req.query.sessionId as string;
          const transport = transports[sessionId];

          if (!transport) {
            return res.status(400).json({
              jsonrpc: '2.0',
              error: { code: -32000, message: 'Invalid session ID' },
              id: null
            });
          }

          res.json({
            jsonrpc: '2.0',
            result: { status: 'received' },
            id: req.body.id
          });

        } catch (error) {
          logger.error('Message handling error:', error);
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal error' },
            id: req.body?.id || null
          });
        }
      });

      // Health check
      this.app.get('/health', (req, res) => {
        res.json({
          status: 'healthy',
          server: 'ZK-PRET MCP Server (SSE)',
          version: '1.0.0',
          network: this.networkConfig.type,
          timestamp: new Date().toISOString()
        });
      });

      // Start server
      this.app.listen(port, () => {
        this.isRunning = true;
        logger.info(`ZK-PRET MCP Server (SSE) listening on port ${port}`);
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`Health check: http://localhost:${port}/health`);
      });

    } catch (error) {
      logger.error('Failed to start SSE server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.isRunning = false;
      logger.info('ZK-PRET MCP Server stopped');
    } catch (error) {
      logger.error('Error stopping server:', error);
      throw error;
    }
  }

  public getServer(): McpServer {
    return this.server;
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }
}