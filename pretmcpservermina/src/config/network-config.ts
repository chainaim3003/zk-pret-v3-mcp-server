export type NetworkType = 'local' | 'devnet' | 'testnet' | 'mainnet';

export interface MinaNetworkConfig {
  networkId: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  chainId: string;
  accountManagerUrl?: string;
}

export class NetworkConfig {
  private configs: Record<NetworkType, MinaNetworkConfig>;

  constructor() {
    this.configs = {
      local: {
        networkId: 'local',
        name: 'Local Development',
        rpcUrl: 'http://localhost:8080/graphql',
        explorerUrl: 'http://localhost:8080',
        faucetUrl: 'http://localhost:8080/faucet',
        chainId: 'local',
        accountManagerUrl: 'http://localhost:8181'
      },
      devnet: {
        networkId: 'devnet',
        name: 'Mina Devnet',
        rpcUrl: 'https://api.minascan.io/node/devnet/v1/graphql',
        explorerUrl: 'https://devnet.minaexplorer.com',
        faucetUrl: 'https://faucet.minaprotocol.com',
        chainId: 'devnet',
        accountManagerUrl: 'https://devnet.minaprotocol.com'
      },
      testnet: {
        networkId: 'testnet', 
        name: 'Mina Testnet (Berkeley)',
        rpcUrl: 'https://api.minascan.io/node/berkeley/v1/graphql',
        explorerUrl: 'https://berkeley.minaexplorer.com',
        faucetUrl: 'https://faucet.minaprotocol.com',
        chainId: 'berkeley',
        accountManagerUrl: 'https://berkeley.minaprotocol.com'
      },
      mainnet: {
        networkId: 'mainnet',
        name: 'Mina Mainnet',
        rpcUrl: 'https://api.minascan.io/node/mainnet/v1/graphql',
        explorerUrl: 'https://minaexplorer.com',
        chainId: 'mainnet',
        accountManagerUrl: 'https://minaprotocol.com'
      }
    };
  }

  getConfig(network: NetworkType): MinaNetworkConfig {
    return this.configs[network];
  }

  getAllNetworks(): Record<NetworkType, MinaNetworkConfig> {
    return { ...this.configs };
  }

  getNetworkTypes(): NetworkType[] {
    return Object.keys(this.configs) as NetworkType[];
  }

  isValidNetwork(network: string): network is NetworkType {
    return network in this.configs;
  }

  getDefaultNetwork(): NetworkType {
    return 'testnet';
  }
}