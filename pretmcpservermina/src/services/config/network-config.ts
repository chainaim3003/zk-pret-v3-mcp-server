export type NetworkType = 'mainnet' | 'testnet';

export interface MinaNetworkEndpoints {
  networkId: string;
  minaEndpoint: string;
  archiveEndpoint: string;
}

export interface MinaNetworkConfig {
  type: NetworkType;
  mina: MinaNetworkEndpoints;
}

export const NETWORK_CONFIGS: Record<NetworkType, MinaNetworkConfig> = {
  mainnet: {
    type: 'mainnet',
    mina: {
      networkId: 'mainnet',
      minaEndpoint: 'https://proxy.berkeley.minaexplorer.com',
      archiveEndpoint: 'https://archive.berkeley.minaexplorer.com'
    }
  },
  testnet: {
    type: 'testnet',
    mina: {
      networkId: 'testnet',
      minaEndpoint: 'https://proxy.berkeley.minaexplorer.com',
      archiveEndpoint: 'https://archive.berkeley.minaexplorer.com'
    }
  }
};

export function getNetworkConfig(network: NetworkType): MinaNetworkConfig {
  return NETWORK_CONFIGS[network];
}

export function validateNetworkConfig(config: MinaNetworkConfig): boolean {
  if (!config || !config.type || !config.mina) {
    return false;
  }

  const { mina } = config;
  if (!mina.networkId || !mina.minaEndpoint || !mina.archiveEndpoint) {
    return false;
  }

  // Validate URLs
  try {
    new URL(mina.minaEndpoint);
    new URL(mina.archiveEndpoint);
  } catch {
    return false;
  }

  return true;
}