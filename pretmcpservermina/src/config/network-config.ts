export type NetworkType = 'local' | 'devnet' | 'testnet' | 'mainnet';

export interface MinaNetworkConfig {
  networkId: string;
  graphqlEndpoint: string;
  archiveEndpoint?: string;
  explorerUrl?: string;
  faucetUrl?: string;
  chainId: string;
  name: string;
}

export class MinaNetworkConfig {
  private static configs: Record<NetworkType, MinaNetworkConfig> = {
    local: {
      networkId: 'mina:local',
      graphqlEndpoint: 'http://localhost:3085/graphql',
      archiveEndpoint: 'http://localhost:3086',
      explorerUrl: 'http://localhost:3000',
      faucetUrl: 'http://localhost:3085/faucet',
      chainId: 'mina:local',
      name: 'Local Network'
    },
    devnet: {
      networkId: 'mina:devnet',
      graphqlEndpoint: 'https://api.minascan.io/node/devnet/v1/graphql',
      archiveEndpoint: 'https://api.minascan.io/archive/devnet/v1/graphql',
      explorerUrl: 'https://devnet.minascan.io',
      faucetUrl: 'https://faucet.minaprotocol.com',
      chainId: 'mina:devnet',
      name: 'Devnet'
    },
    testnet: {
      networkId: 'mina:testnet',
      graphqlEndpoint: 'https://api.minascan.io/node/testnet/v1/graphql',
      archiveEndpoint: 'https://api.minascan.io/archive/testnet/v1/graphql',
      explorerUrl: 'https://testnet.minascan.io',
      faucetUrl: 'https://faucet.minaprotocol.com',
      chainId: 'mina:testnet',
      name: 'Testnet'
    },
    mainnet: {
      networkId: 'mina:mainnet',
      graphqlEndpoint: 'https://api.minascan.io/node/mainnet/v1/graphql',
      archiveEndpoint: 'https://api.minascan.io/archive/mainnet/v1/graphql',
      explorerUrl: 'https://minascan.io',
      chainId: 'mina:mainnet',
      name: 'Mainnet'
    }
  };

  static getConfig(network: NetworkType): MinaNetworkConfig {
    const config = this.configs[network];
    if (!config) {
      throw new Error(`Unknown network: ${network}`);
    }
    return config;
  }

  static getAllNetworks(): Record<NetworkType, MinaNetworkConfig> {
    return this.configs;
  }

  static isValidNetwork(network: string): network is NetworkType {
    return Object.keys(this.configs).includes(network);
  }
}