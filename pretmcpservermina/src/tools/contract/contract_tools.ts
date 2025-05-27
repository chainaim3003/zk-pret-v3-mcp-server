// Fix for TS2307: Cannot find module - using relative path without .js extension
import { ContractManager } from '../../services/contracts/contract-manager.js';
import { ToolHandler, ToolDefinition } from '../../server/tool-registry.js';

export interface ContractDeployArgs {
  contractName: string;
  constructorArgs?: string[];
  networkId?: 'mainnet' | 'testnet';
}

export interface ContractCallArgs {
  contractAddress: string;
  methodName: string;
  args?: string[];
  networkId?: 'mainnet' | 'testnet';
}

export interface ContractVerifyArgs {
  contractAddress: string;
  sourceCode: string;
  constructorArgs?: string[];
  networkId?: 'mainnet' | 'testnet';
}

export class ContractToolHandlers {
  constructor(private contractManager: ContractManager) {}

  public getToolHandlers(): ToolHandler[] {
    return [
      this.createDeployHandler(),
      this.createCallHandler(),
      this.createVerifyHandler(),
      this.createGetStateHandler(),
      this.createCompileHandler()
    ];
  }

  private createDeployHandler(): ToolHandler {
    const tool: ToolDefinition = {
      name: 'contract_deploy',
      description: 'Deploy a smart contract to the Mina network',
      category: 'contract',
      inputSchema: {
        type: 'object',
        properties: {
          contractName: {
            type: 'string',
            description: 'Name of the contract to deploy'
          },
          constructorArgs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Constructor arguments'
          },
          networkId: {
            type: 'string',
            enum: ['mainnet', 'testnet'],
            description: 'Target network'
          }
        },
        required: ['contractName']
      }
    };

    return {
      tool,
      handler: async (args: ContractDeployArgs) => {
        try {
          const result = await this.contractManager.deployContract(
            args.contractName,
            args.constructorArgs || [],
            args.networkId || 'testnet'
          );

          return {
            content: [{
              type: 'text',
              text: `Contract deployed successfully!\n` +
                    `Name: ${args.contractName}\n` +
                    `Address: ${result.address}\n` +
                    `Transaction: ${result.transactionHash}\n` +
                    `Network: ${args.networkId || 'testnet'}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }
    };
  }

  private createCallHandler(): ToolHandler {
    const tool: ToolDefinition = {
      name: 'contract_call',
      description: 'Call a method on a deployed smart contract',
      category: 'contract',
      inputSchema: {
        type: 'object',
        properties: {
          contractAddress: {
            type: 'string',
            description: 'Address of the deployed contract'
          },
          methodName: {
            type: 'string',
            description: 'Name of the method to call'
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Method arguments'
          },
          networkId: {
            type: 'string',
            enum: ['mainnet', 'testnet'],
            description: 'Target network'
          }
        },
        required: ['contractAddress', 'methodName']
      }
    };

    return {
      tool,
      handler: async (args: ContractCallArgs) => {
        try {
          const result = await this.contractManager.callContract(
            args.contractAddress,
            args.methodName,
            args.args || [],
            args.networkId || 'testnet'
          );

          return {
            content: [{
              type: 'text',
              text: `Contract method called successfully!\n` +
                    `Address: ${args.contractAddress}\n` +
                    `Method: ${args.methodName}\n` +
                    `Result: ${JSON.stringify(result.returnValue)}\n` +
                    `Transaction: ${result.transactionHash}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Contract call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }
    };
  }

  private createVerifyHandler(): ToolHandler {
    const tool: ToolDefinition = {
      name: 'contract_verify',
      description: 'Verify a deployed smart contract',
      category: 'contract',
      inputSchema: {
        type: 'object',
        properties: {
          contractAddress: {
            type: 'string',
            description: 'Address of the deployed contract'
          },
          sourceCode: {
            type: 'string',
            description: 'Source code of the contract'
          },
          constructorArgs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Constructor arguments used during deployment'
          },
          networkId: {
            type: 'string',
            enum: ['mainnet', 'testnet'],
            description: 'Target network'
          }
        },
        required: ['contractAddress', 'sourceCode']
      }
    };

    return {
      tool,
      handler: async (args: ContractVerifyArgs) => {
        try {
          const result = await this.contractManager.verifyContract(
            args.contractAddress,
            args.sourceCode,
            args.constructorArgs || [],
            args.networkId || 'testnet'
          );

          return {
            content: [{
              type: 'text',
              text: `Contract verification completed!\n` +
                    `Address: ${args.contractAddress}\n` +
                    `Status: ${result.verified ? 'Verified' : 'Failed'}\n` +
                    `Message: ${result.message}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Contract verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }
    };
  }

  private createGetStateHandler(): ToolHandler {
    const tool: ToolDefinition = {
      name: 'contract_get_state',
      description: 'Get the current state of a deployed smart contract',
      category: 'contract',
      inputSchema: {
        type: 'object',
        properties: {
          contractAddress: {
            type: 'string',
            description: 'Address of the deployed contract'
          },
          networkId: {
            type: 'string',
            enum: ['mainnet', 'testnet'],
            description: 'Target network'
          }
        },
        required: ['contractAddress']
      }
    };

    return {
      tool,
      handler: async (args: { contractAddress: string; networkId?: 'mainnet' | 'testnet' }) => {
        try {
          const state = await this.contractManager.getContractState(
            args.contractAddress,
            args.networkId || 'testnet'
          );

          // Fix for TS7006: Parameter 'field' implicitly has an 'any' type
          const appStateFormatted = state.appState.map((field: any) => field.toString());

          return {
            content: [{
              type: 'text',
              text: `Contract State:\n` +
                    `Address: ${args.contractAddress}\n` +
                    `App State: ${appStateFormatted.join(', ')}\n` +
                    `Nonce: ${state.nonce}\n` +
                    `Balance: ${state.balance}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to get contract state: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }
    };
  }

  private createCompileHandler(): ToolHandler {
    const tool: ToolDefinition = {
      name: 'contract_compile',
      description: 'Compile a smart contract from source code',
      category: 'contract',
      inputSchema: {
        type: 'object',
        properties: {
          sourceCode: {
            type: 'string',
            description: 'Source code of the contract to compile'
          },
          contractName: {
            type: 'string',
            description: 'Name of the contract'
          },
          optimize: {
            type: 'boolean',
            description: 'Enable compiler optimizations'
          }
        },
        required: ['sourceCode', 'contractName']
      }
    };

    return {
      tool,
      handler: async (args: { sourceCode: string; contractName: string; optimize?: boolean }) => {
        try {
          const result = await this.contractManager.compileContract(
            args.sourceCode,
            args.contractName,
            args.optimize || false
          );

          return {
            content: [{
              type: 'text',
              text: `Contract compiled successfully!\n` +
                    `Name: ${args.contractName}\n` +
                    `Bytecode Length: ${result.bytecode.length} bytes\n` +
                    `ABI Methods: ${result.abi.methods.length}\n` +
                    `Compilation Time: ${result.compilationTime}ms`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Contract compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }],
            isError: true
          };
        }
      }
    };
  }
}