import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent,
  ListResourcesRequestSchema,
  Resource,
  ReadResourceRequestSchema,
  ResourceContents,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
  PromptMessage
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../utils/logger.js';
import { MinaNetworkConfig, NetworkType } from '../config/network-config.js';
import { AppConfig, AppConfigType } from '../config/app-config.js';
import { WalletManager } from '../services/wallet/wallet-manager.js';
import { ContractManager } from '../services/contracts/contract-manager.js';
import { ToolRegistry } from './tool-registry.js';

// Tool Handlers
import { ContractToolHandlers } from './tool-handlers/contract-tools.js';
import { ComplianceToolHandlers } from './tool-handlers/compliance-tools.js';
import { GLEIFToolHandlers } from './tool-handlers/gleif-tools.js';
import { EXIMToolHandlers } from './tool-handlers/exim-tools.js';
import { BPMNToolHandlers } from './tool-handlers/bpmn-tools.js';
import { ActusToolHandlers } from './tool-handlers/actus-tools.js';
import { DataIntegrityToolHandlers } from './tool-handlers/data-integrity-tools.js';
import { TestToolHandlers } from './tool-handlers/test-tools.js';
import { WalletToolHandlers } from './tool-handlers/wallet-tools.js';
import { UtilityToolHandlers } from './tool-handlers/utility-tools.js';

// Services
import { ComplianceService } from '../services/verification/compliance-service.js';
import { GLEIFService } from '../services/verification/gleif-service.js';
import { EXIMService } from '../services/verification/exim-service.js';
import { BPMNService } from '../services/verification/bpmn-service.js';
import { ActusService } from '../services/verification/actus-service.js';
import { DataIntegrityService } from '../services/verification/data-integrity-service.js';
import { TestRunner } from '../services/testing/test-runner.js';
import { ProofGenerator } from '../services/proofs/proof-generator.js';
import { ProofVerifier } from '../services/proofs/proof-verifier.js';

export interface ZKPRETServerDependencies {
  walletManager: WalletManager;
  contractManager: ContractManager;
  complianceService: ComplianceService;
  gleifService: GLEIFService;
  eximService: EXIMService;
  bpmnService: BPMNService;
  actusService: ActusService;
  dataIntegrityService: DataIntegrityService;
  testRunner: TestRunner;
  proofGenerator: ProofGenerator;
  proofVerifier: ProofVerifier;
}

export class ZKPRETMCPServer {
  private toolRegistry: ToolRegistry;
  private dependencies: ZKPRETServerDependencies;
  private isInitialized = false;

  // Tool Handlers
  private contractTools: ContractToolHandlers;
  private complianceTools: ComplianceToolHandlers;
  private gleifTools: GLEIFToolHandlers;
  private eximTools: EXIMToolHandlers;
  private bpmnTools: BPMNToolHandlers;
  private actusTools: ActusToolHandlers;
  private dataIntegrityTools: DataIntegrityToolHandlers;
  private testTools: TestToolHandlers;
  private walletTools: WalletToolHandlers;
  private utilityTools: UtilityToolHandlers;

  constructor(
    private server: Server,
    private networkConfig: MinaNetworkConfig,
    private walletManager: WalletManager,
    private appConfig: AppConfig
  ) {
    this.toolRegistry = new ToolRegistry();
    
    // Initialize dependencies
    this.dependencies = this.initializeDependencies();
    
    // Initialize tool handlers
    this.initializeToolHandlers();
  }

  private initializeDependencies(): ZKPRETServerDependencies {
    const contractManager = new ContractManager(this.networkConfig, this.walletManager);
    const complianceService = new ComplianceService(this.networkConfig, this.appConfig);
    const gleifService = new GLEIFService(this.appConfig);
    const eximService = new EXIMService(this.networkConfig, this.appConfig);
    const bpmnService = new BPMNService(this.appConfig);
    const actusService = new ActusService(this.appConfig);
    const dataIntegrityService = new DataIntegrityService(this.appConfig);
    const testRunner = new TestRunner(contractManager, this.appConfig);
    const proofGenerator = new ProofGenerator(this.networkConfig);
    const proofVerifier = new ProofVerifier(this.networkConfig);

    return {
      walletManager: this.walletManager,
      contractManager,
      complianceService,
      gleifService,
      eximService,
      bpmnService,
      actusService,
      dataIntegrityService,
      testRunner,
      proofGenerator,
      proofVerifier
    };
  }

  private initializeToolHandlers(): void {
    this.contractTools = new ContractToolHandlers(this.dependencies.contractManager);
    this.complianceTools = new ComplianceToolHandlers(this.dependencies.complianceService);
    this.gleifTools = new GLEIFToolHandlers(this.dependencies.gleifService);
    this.eximTools = new EXIMToolHandlers(this.dependencies.eximService);
    this.bpmnTools = new BPMNToolHandlers(this.dependencies.bpmnService);
    this.actusTools = new ActusToolHandlers(this.dependencies.actusService);
    this.dataIntegrityTools = new DataIntegrityToolHandlers(this.dependencies.dataIntegrityService);
    this.testTools = new TestToolHandlers(this.dependencies.testRunner);
    this.walletTools = new WalletToolHandlers(this.dependencies.walletManager);
    this.utilityTools = new UtilityToolHandlers(
      this.dependencies.proofGenerator,
      this.dependencies.proofVerifier
    );
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing ZK-PRET MCP Server...', {
        network: this.networkConfig.name,
        environment: this.appConfig.server.environment
      });

      // Initialize all services
      await Promise.all([
        this.dependencies.contractManager.initialize(),
        this.dependencies.complianceService.initialize(),
        this.dependencies.gleifService.initialize(),
        this.dependencies.eximService.initialize(),
        this.dependencies.bpmnService.initialize(),
        this.dependencies.actusService.initialize(),
        this.dependencies.dataIntegrityService.initialize(),
        this.dependencies.testRunner.initialize(),
        this.dependencies.proofGenerator.initialize(),
        this.dependencies.proofVerifier.initialize()
      ]);

      // Register all MCP handlers
      this.registerMCPHandlers();

      // Register all tools
      this.registerTools();

      // Register resources
      this.registerResources();

      // Register prompts
      this.registerPrompts();

      this.isInitialized = true;
      logger.info('ZK-PRET MCP Server initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize ZK-PRET MCP Server:', error);
      throw error;
    }
  }

  private registerMCPHandlers(): void {
    // Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.toolRegistry.getAllTools() };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleToolCall(request.params.name, request.params.arguments);
    });

    // Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: await this.getAvailableResources() };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await this.readResource(request.params.uri);
    });

    // Prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: await this.getAvailablePrompts() };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return await this.getPrompt(request.params.name, request.params.arguments);
    });
  }

  private registerTools(): void {
    // Contract Management Tools
    this.toolRegistry.registerTools(this.contractTools.getTools());

    // Verification Tools
    this.toolRegistry.registerTools(this.complianceTools.getTools());
    this.toolRegistry.registerTools(this.gleifTools.getTools());
    this.toolRegistry.registerTools(this.eximTools.getTools());
    this.toolRegistry.registerTools(this.bpmnTools.getTools());
    this.toolRegistry.registerTools(this.actusTools.getTools());
    this.toolRegistry.registerTools(this.dataIntegrityTools.getTools());

    // Testing Tools
    this.toolRegistry.registerTools(this.testTools.getTools());

    // Wallet Tools
    this.toolRegistry.registerTools(this.walletTools.getTools());

    // Utility Tools
    this.toolRegistry.registerTools(this.utilityTools.getTools());

    logger.info(`Registered ${this.toolRegistry.getToolCount()} MCP tools`);
  }

  private registerResources(): void {
    // Resources will be registered for accessing test data, documentation, etc.
    // Implementation will be added in the resource handlers
  }

  private registerPrompts(): void {
    // Prompts will be registered for common ZK-PRET workflows
    // Implementation will be added in the prompt handlers
  }

  private async handleToolCall(toolName: string, args: any): Promise<CallToolResult> {
    try {
      logger.info(`Executing tool: ${toolName}`, { args });

      // Route to appropriate tool handler
      if (this.contractTools.hasTool(toolName)) {
        return await this.contractTools.handleTool(toolName, args);
      } else if (this.complianceTools.hasTool(toolName)) {
        return await this.complianceTools.handleTool(toolName, args);
      } else if (this.gleifTools.hasTool(toolName)) {
        return await this.gleifTools.handleTool(toolName, args);
      } else if (this.eximTools.hasTool(toolName)) {
        return await this.eximTools.handleTool(toolName, args);
      } else if (this.bpmnTools.hasTool(toolName)) {
        return await this.bpmnTools.handleTool(toolName, args);
      } else if (this.actusTools.hasTool(toolName)) {
        return await this.actusTools.handleTool(toolName, args);
      } else if (this.dataIntegrityTools.hasTool(toolName)) {
        return await this.dataIntegrityTools.handleTool(toolName, args);
      } else if (this.testTools.hasTool(toolName)) {
        return await this.testTools.handleTool(toolName, args);
      } else if (this.walletTools.hasTool(toolName)) {
        return await this.walletTools.handleTool(toolName, args);
      } else if (this.utilityTools.hasTool(toolName)) {
        return await this.utilityTools.handleTool(toolName, args);
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
      }

    } catch (error) {
      logger.error(`Error executing tool ${toolName}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }

  private async getAvailableResources(): Promise<Resource[]> {
    return [
      {
        uri: 'zkpret://contracts/list',
        name: 'Deployed Contracts',
        description: 'List of all deployed ZK-PRET contracts',
        mimeType: 'application/json'
      },
      {
        uri: 'zkpret://network/info',
        name: 'Network Information',
        description: 'Current Mina network configuration and status',
        mimeType: 'application/json'
      },
      {
        uri: 'zkpret://wallet/info',
        name: 'Wallet Information',
        description: 'Current wallet status and balance',
        mimeType: 'application/json'
      },
      {
        uri: 'zkpret://test-data/scf',
        name: 'Supply Chain Finance Test Data',
        description: 'BPMN and contract data for SCF testing',
        mimeType: 'application/json'
      },
      {
        uri: 'zkpret://test-data/stablecoin',
        name: 'Stablecoin Test Data',
        description: 'BPMN and compliance data for stablecoin testing',
        mimeType: 'application/json'
      },
      {
        uri: 'zkpret://documentation/api',
        name: 'API Documentation',
        description: 'Complete API documentation for ZK-PRET MCP server',
        mimeType: 'text/markdown'
      }
    ];
  }

  private async readResource(uri: string): Promise<ResourceContents> {
    try {
      const [, , resourceType, resourceId] = uri.split('/');

      switch (resourceType) {
        case 'contracts':
          if (resourceId === 'list') {
            const contracts = await this.dependencies.contractManager.getDeployedContracts();
            return {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(contracts, null, 2)
            };
          }
          break;

        case 'network':
          if (resourceId === 'info') {
            const networkInfo = {
              current: this.networkConfig.name,
              config: this.networkConfig,
              available: Object.keys(MinaNetworkConfig.getAllNetworks())
            };
            return {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(networkInfo, null, 2)
            };
          }
          break;

        case 'wallet':
          if (resourceId === 'info') {
            const walletInfo = await this.dependencies.walletManager.getWalletInfo();
            return {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(walletInfo, null, 2)
            };
          }
          break;

        case 'test-data':
          // Load test data from files
          const testData = await this.loadTestData(resourceId);
          return {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(testData, null, 2)
          };

        case 'documentation':
          if (resourceId === 'api') {
            const apiDoc = await this.generateAPIDocumentation();
            return {
              uri,
              mimeType: 'text/markdown',
              text: apiDoc
            };
          }
          break;

        default:
          throw new Error(`Unknown resource type: ${resourceType}`);
      }

      throw new Error(`Resource not found: ${uri}`);

    } catch (error) {
      logger.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  }

  private async getAvailablePrompts(): Promise<Prompt[]> {
    return [
      {
        name: 'deploy-compliance-stack',
        description: 'Deploy complete ZK-PRET compliance verification stack',
        arguments: [
          {
            name: 'network',
            description: 'Target network for deployment',
            required: true
          },
          {
            name: 'jurisdiction',
            description: 'Primary jurisdiction for compliance',
            required: false
          }
        ]
      },
      {
        name: 'verify-trade-compliance',
        description: 'Verify complete trade compliance (GLEIF + EXIM + BPMN)',
        arguments: [
          {
            name: 'tradeData',
            description: 'Trade transaction data',
            required: true
          }
        ]
      },
      {
        name: 'run-full-test-suite',
        description: 'Execute complete ZK-PRET test suite with reporting',
        arguments: [
          {
            name: 'network',
            description: 'Network to run tests on',
            required: false
          }
        ]
      }
    ];
  }

  private async getPrompt(name: string, args?: any): Promise<{ messages: PromptMessage[] }> {
    // Implementation for prompt handling
    // This will be expanded based on specific prompt requirements
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Executing prompt: ${name} with arguments: ${JSON.stringify(args)}`
          }
        }
      ]
    };
  }

  private async loadTestData(type: string): Promise<any> {
    // Load test data from the data directory
    // Implementation will read actual test files
    return {};
  }

  private async generateAPIDocumentation(): Promise<string> {
    const tools = this.toolRegistry.getAllTools();
    
    let doc = '# ZK-PRET MCP Server API Documentation\n\n';
    doc += `Generated: ${new Date().toISOString()}\n\n`;
    doc += `Total Tools: ${tools.length}\n\n`;

    // Group tools by category
    const categories = tools.reduce((acc, tool) => {
      const category = tool.name.split('_')[0];
      if (!acc[category]) acc[category] = [];
      acc[category].push(tool);
      return acc;
    }, {} as Record<string, Tool[]>);

    for (const [category, categoryTools] of Object.entries(categories)) {
      doc += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Tools\n\n`;
      
      for (const tool of categoryTools) {
        doc += `### ${tool.name}\n\n`;
        doc += `${tool.description}\n\n`;
        
        if (tool.inputSchema) {
          doc += '**Input Schema:**\n```json\n';
          doc += JSON.stringify(tool.inputSchema, null, 2);
          doc += '\n```\n\n';
        }
      }
    }

    return doc;
  }

  // Public methods for accessing server state
  public async getAvailableTools(): Promise<Tool[]> {
    return this.toolRegistry.getAllTools();
  }

  public async getDeployedContracts(): Promise<any> {
    return await this.dependencies.contractManager.getDeployedContracts();
  }

  public getWalletManager(): WalletManager {
    return this.dependencies.walletManager;
  }

  public getNetworkConfig(): MinaNetworkConfig {
    return this.networkConfig;
  }

  public getAppConfig(): AppConfig {
    return this.appConfig;
  }

  public isServerInitialized(): boolean {
    return this.isInitialized;
  }

  // Health check method
  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const walletInfo = await this.dependencies.walletManager.getWalletInfo();
      const contracts = await this.dependencies.contractManager.getDeployedContracts();
      
      return {
        status: 'healthy',
        details: {
          initialized: this.isInitialized,
          network: this.networkConfig.name,
          wallet: {
            connected: walletInfo.isConnected,
            address: walletInfo.address,
            balance: walletInfo.balance
          },
          contracts: {
            deployed: Object.keys(contracts).length,
            compiled: this.dependencies.contractManager.getCompiledContracts().size
          },
          tools: {
            registered: this.toolRegistry.getToolCount()
          },
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up ZK-PRET MCP Server...');

      // Cleanup all services
      await Promise.allSettled([
        this.dependencies.contractManager.cleanup(),
        this.dependencies.complianceService.cleanup(),
        this.dependencies.gleifService.cleanup(),
        this.dependencies.eximService.cleanup(),
        this.dependencies.bpmnService.cleanup(),
        this.dependencies.actusService.cleanup(),
        this.dependencies.dataIntegrityService.cleanup(),
        this.dependencies.testRunner.cleanup(),
        this.dependencies.proofGenerator.cleanup(),
        this.dependencies.proofVerifier.cleanup(),
        this.dependencies.walletManager.cleanup()
      ]);

      // Clear tool registry
      this.toolRegistry.clear();
      
      this.isInitialized = false;
      logger.info('ZK-PRET MCP Server cleanup completed');

    } catch (error) {
      logger.error('Error during ZK-PRET MCP Server cleanup:', error);
      throw error;
    }
  }
}