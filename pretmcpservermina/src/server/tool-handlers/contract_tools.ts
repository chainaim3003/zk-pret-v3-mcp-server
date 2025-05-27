import { Tool, CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
//import { ContractManager } from '../../services/contracts/contract-manager.js';
import { NetworkType } from '../../config/network-config.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';

// Input validation schemas
const DeployContractSchema = z.object({
  contractType: z.enum(['compliance', 'gleif', 'exim', 'bpmn', 'actus', 'data_integrity']),
  network: z.enum(['local', 'devnet', 'testnet', 'mainnet']),
  initParams: z.record(z.any()).optional().default({})
});

const GetContractStateSchema = z.object({
  contractAddress: z.string().min(1),
  network: z.enum(['local', 'devnet', 'testnet', 'mainnet'])
});

const CompileContractSchema = z.object({
  contractType: z.enum(['compliance', 'gleif', 'exim', 'bpmn', 'actus', 'data_integrity'])
});

const CallContractMethodSchema = z.object({
  contractAddress: z.string().min(1),
  methodName: z.string().min(1),
  args: z.array(z.any()).optional().default([]),
  network: z.enum(['local', 'devnet', 'testnet', 'mainnet']).optional()
});

export class ContractToolHandlers {
  private tools: Array<{ tool: Tool; handler: (args: any) => Promise<CallToolResult> }> = [];

  constructor(private contractManager: ContractManager) {
    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools = [
      {
        tool: {
          name: 'contract_deploy',
          description: 'Deploy a ZK-PRET smart contract to the specified Mina network',
          inputSchema: {
            type: 'object',
            properties: {
              contractType: {
                type: 'string',
                enum: ['compliance', 'gleif', 'exim', 'bpmn', 'actus', 'data_integrity'],
                description: 'Type of ZK-PRET contract to deploy'
              },
              network: {
                type: 'string',
                enum: ['local', 'devnet', 'testnet', 'mainnet'],
                description: 'Target Mina network for deployment'
              },
              initParams: {
                type: 'object',
                description: 'Initialization parameters for the contract',
                properties: {
                  complianceLevel: { type: 'number', description: 'For compliance contracts: 1=local, 2=export_import, 3=global_lei' },
                  registryRoot: { type: 'string', description: 'For GLEIF contracts: Initial registry merkle root' },
                  tradeThreshold: { type: 'number', description: 'For EXIM contracts: Minimum trade value threshold' },
                  processRoot: { type: 'string', description: 'For BPMN contracts: Initial process merkle root' },
                  liquidityThreshold: { type: 'number', description: 'For ACTUS contracts: Minimum liquidity threshold' },
                  integrityRoot: { type: 'string', description: 'For data integrity contracts: Initial integrity merkle root' }
                },
                additionalProperties: true
              }
            },
            required: ['contractType', 'network']
          }
        },
        handler: this.handleDeployContract.bind(this)
      },
      {
        tool: {
          name: 'contract_compile',
          description: 'Compile a ZK-PRET smart contract and generate verification key',
          inputSchema: {
            type: 'object',
            properties: {
              contractType: {
                type: 'string',
                enum: ['compliance', 'gleif', 'exim', 'bpmn', 'actus', 'data_integrity'],
                description: 'Type of ZK-PRET contract to compile'
              }
            },
            required: ['contractType']
          }
        },
        handler: this.handleCompileContract.bind(this)
      },
      {
        tool: {
          name: 'contract_get_state',
          description: 'Get the current state of a deployed ZK-PRET contract',
          inputSchema: {
            type: 'object',
            properties: {
              contractAddress: {
                type: 'string',
                description: 'Address of the deployed contract (Base58 format)'
              },
              network: {
                type: 'string',
                enum: ['local', 'devnet', 'testnet', 'mainnet'],
                description: 'Network where the contract is deployed'
              }
            },
            required: ['contractAddress', 'network']
          }
        },
        handler: this.handleGetContractState.bind(this)
      },
      {
        tool: {
          name: 'contract_call_method',
          description: 'Call a method on a deployed ZK-PRET contract',
          inputSchema: {
            type: 'object',
            properties: {
              contractAddress: {
                type: 'string',
                description: 'Address of the deployed contract (Base58 format)'
              },
              methodName: {
                type: 'string',
                description: 'Name of the contract method to call'
              },
              args: {
                type: 'array',
                items: { type: 'string' },
                description: 'Arguments to pass to the contract method',
                default: []
              },
              network: {
                type: 'string',
                enum: ['local', 'devnet', 'testnet', 'mainnet'],
                description: 'Network where the contract is deployed (optional)'
              }
            },
            required: ['contractAddress', 'methodName']
          }
        },
        handler: this.handleCallContractMethod.bind(this)
      },
      {
        tool: {
          name: 'contract_list_deployed',
          description: 'List all deployed ZK-PRET contracts',
          inputSchema: {
            type: 'object',
            properties: {
              network: {
                type: 'string',
                enum: ['local', 'devnet', 'testnet', 'mainnet'],
                description: 'Filter by network (optional)'
              },
              contractType: {
                type: 'string',
                enum: ['compliance', 'gleif', 'exim', 'bpmn', 'actus', 'data_integrity'],
                description: 'Filter by contract type (optional)'
              }
            }
          }
        },
        handler: this.handleListDeployedContracts.bind(this)
      },
      {
        tool: {
          name: 'contract_get_compiled',
          description: 'Get information about compiled contracts',
          inputSchema: {
            type: 'object',
            properties: {
              contractType: {
                type: 'string',
                enum: ['compliance', 'gleif', 'exim', 'bpmn', 'actus', 'data_integrity'],
                description: 'Filter by contract type (optional)'
              }
            }
          }
        },
        handler: this.handleGetCompiledContracts.bind(this)
      },
      {
        tool: {
          name: 'contract_load_existing',
          description: 'Load an existing deployed contract for interaction',
          inputSchema: {
            type: 'object',
            properties: {
              contractAddress: {
                type: 'string',
                description: 'Address of the deployed contract (Base58 format)'
              },
              contractType: {
                type: 'string',
                enum: ['compliance', 'gleif', 'exim', 'bpmn', 'actus', 'data_integrity'],
                description: 'Type of the contract to load'
              },
              network: {
                type: 'string',
                enum: ['local', 'devnet', 'testnet', 'mainnet'],
                description: 'Network where the contract is deployed (optional)'
              }
            },
            required: ['contractAddress', 'contractType']
          }
        },
        handler: this.handleLoadExistingContract.bind(this)
      }
    ];
  }

  public getTools(): Array<{ tool: Tool; handler: (args: any) => Promise<CallToolResult> }> {
    return this.tools;
  }

  public hasTool(name: string): boolean {
    return this.tools.some(t => t.tool.name === name);
  }

  public async handleTool(name: string, args: any): Promise<CallToolResult> {
    const tool = this.tools.find(t => t.tool.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await tool.handler(args);
  }

  private async handleDeployContract(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = DeployContractSchema.parse(args);
      
      logger.info('Deploying contract', validatedArgs);
      
      const result = await this.contractManager.deployContract(
        validatedArgs.contractType,
        validatedArgs.network as NetworkType,
        validatedArgs.initParams
      );

      return {
        content: [
          {
            type: 'text',
            text: `✅ Contract deployed successfully!

**Deployment Details:**
- Contract Type: ${validatedArgs.contractType}
- Network: ${validatedArgs.network}
- Contract Address: \`${result.contractAddress}\`
- Transaction Hash: \`${result.transactionHash}\`
- Status: ${result.status}
- Deployment Time: ${result.deploymentTime}ms
${result.verificationKeyHash ? `- Verification Key Hash: \`${result.verificationKeyHash}\`` : ''}

**Initialization Parameters:**
\`\`\`json
${JSON.stringify(validatedArgs.initParams, null, 2)}
\`\`\`

You can now interact with this contract using the contract address.`
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Contract deployment failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Contract deployment failed: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }

  private async handleCompileContract(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = CompileContractSchema.parse(args);
      
      logger.info('Compiling contract', validatedArgs);
      
      const result = await this.contractManager.compileContract(validatedArgs.contractType);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Contract compiled successfully!

**Compilation Details:**
- Contract Type: ${validatedArgs.contractType}
- Verification Key Hash: \`${result.verificationKeyHash}\`
- Compilation Time: ${result.compilationTime}ms
- Contract Size: ${result.contractSize} bytes

The contract is now ready for deployment.`
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Contract compilation failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Contract compilation failed: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }

  private async handleGetContractState(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = GetContractStateSchema.parse(args);
      
      const state = await this.contractManager.getContractState(
        validatedArgs.contractAddress,
        validatedArgs.network as NetworkType
      );

      return {
        content: [
          {
            type: 'text',
            text: `📋 Contract State Information

**Contract Address:** \`${validatedArgs.contractAddress}\`
**Network:** ${validatedArgs.network}

**Account Details:**
- Balance: ${state.balance} MINA
- Nonce: ${state.nonce}
- Deployed: ${state.isDeployed ? '✅ Yes' : '❌ No'}
- Last Updated: ${state.lastUpdated.toISOString()}

**ZkApp State:**
\`\`\`json
${JSON.stringify({
  appState: state.appState.map(field => field.toString()),
  permissions: state.permissions,
  timing: state.timing
}, null, 2)}
\`\`\``
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Failed to get contract state:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get contract state: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }

  private async handleCallContractMethod(args: any): Promise<CallToolResult> {
    try {
      const validatedArgs = CallContractMethodSchema.parse(args);
      
      logger.info('Calling contract method', validatedArgs);
      
      const txHash = await this.contractManager.callContractMethod(
        validatedArgs.contractAddress,
        validatedArgs.methodName,
        validatedArgs.args,
        validatedArgs.network as NetworkType | undefined
      );

      return {
        content: [
          {
            type: 'text',
            text: `✅ Contract method called successfully!

**Method Call Details:**
- Contract: \`${validatedArgs.contractAddress}\`
- Method: ${validatedArgs.methodName}
- Arguments: ${JSON.stringify(validatedArgs.args)}
- Transaction Hash: \`${txHash}\`

The transaction has been submitted to the network. You can check its status using the transaction hash.`
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Contract method call failed:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Contract method call failed: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }

  private async handleListDeployedContracts(args: any): Promise<CallToolResult> {
    try {
      const contracts = await this.contractManager.getDeployedContracts();
      
      // Filter by network and contract type if specified
      let filteredContracts = Object.entries(contracts);
      
      if (args.network) {
        // Filter logic would be implemented here
      }
      
      if (args.contractType) {
        // Filter logic would be implemented here
      }

      if (filteredContracts.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📋 No deployed contracts found.\n\nUse the `contract_deploy` tool to deploy ZK-PRET contracts.'
            } as TextContent
          ]
        };
      }

      let result = '📋 **Deployed ZK-PRET Contracts**\n\n';
      
      for (const [address, contractInfo] of filteredContracts) {
        result += `**Contract Address:** \`${address}\`\n`;
        result += `- Type: ${(contractInfo as any).type || 'Unknown'}\n`;
        result += `- Network: ${(contractInfo as any).network || 'Unknown'}\n`;
        result += `- Deployed: ${(contractInfo as any).deployedAt || 'Unknown'}\n\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Failed to list deployed contracts:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list deployed contracts: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }

  private async handleGetCompiledContracts(args: any): Promise<CallToolResult> {
    try {
      const compiled = this.contractManager.getCompiledContracts();
      
      if (compiled.size === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📋 No compiled contracts found.\n\nUse the `contract_compile` tool to compile ZK-PRET contracts.'
            } as TextContent
          ]
        };
      }

      let result = '📋 **Compiled ZK-PRET Contracts**\n\n';
      
      for (const [contractType, contractInfo] of compiled.entries()) {
        result += `**Contract Type:** ${contractType}\n`;
        result += `- Verification Key Hash: \`${(contractInfo as any).verificationKey?.hash || 'Unknown'}\`\n`;
        result += `- Compiled: ✅ Ready for deployment\n\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Failed to get compiled contracts:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get compiled contracts: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }

  private async handleLoadExistingContract(args: any): Promise<CallToolResult> {
    try {
      const { contractAddress, contractType, network } = args;
      
      logger.info('Loading existing contract', { contractAddress, contractType, network });
      
      const contract = await this.contractManager.loadContract(contractAddress, contractType);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Contract loaded successfully!

**Contract Details:**
- Address: \`${contractAddress}\`
- Type: ${contractType}
- Network: ${network || 'Current network'}

The contract is now available for method calls and state queries.`
          } as TextContent
        ]
      };
    } catch (error) {
      logger.error('Failed to load existing contract:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to load contract: ${error instanceof Error ? error.message : String(error)}`
          } as TextContent
        ],
        isError: true
      };
    }
  }
}