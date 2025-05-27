import { NetworkType, MinaNetworkConfig, NetworkConfig } from '../../config/network-config.js';
import { logger } from '../../utils/logger.js';

export interface MinaWalletInfo {
  address: string;
  publicKey: string;
  balance: {
    total: string;
    liquid: string;
    locked: string;
  };
  nonce: number;
  network: NetworkType;
  delegate?: string;
  lastActivity: string;
}

export interface MinaTransaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  fee: string;
  memo?: string;
  nonce: number;
  status: 'pending' | 'included' | 'failed';
  timestamp: string;
}

export class WalletManager {
  private networkConfig: NetworkConfig;
  private currentNetwork: NetworkType;
  private currentConfig: MinaNetworkConfig;

  constructor() {
    this.networkConfig = new NetworkConfig();
    this.currentNetwork = this.networkConfig.getDefaultNetwork();
    this.currentConfig = this.networkConfig.getConfig(this.currentNetwork);
    
    logger.info(`Wallet Manager initialized with network: ${this.currentNetwork}`);
  }

  async switchNetwork(network: NetworkType): Promise<void> {
    if (!this.networkConfig.isValidNetwork(network)) {
      throw new Error(`Invalid network: ${network}. Valid networks: ${this.networkConfig.getNetworkTypes().join(', ')}`);
    }

    this.currentNetwork = network;
    this.currentConfig = this.networkConfig.getConfig(network);
    
    logger.info(`Switched to network: ${network} (${this.currentConfig.name})`);
  }

  getCurrentNetwork(): NetworkType {
    return this.currentNetwork;
  }

  getNetworkConfig(): MinaNetworkConfig {
    return this.currentConfig;
  }

  getAllNetworks(): Record<NetworkType, MinaNetworkConfig> {
    return this.networkConfig.getAllNetworks();
  }

  async getWalletInfo(address?: string): Promise<MinaWalletInfo> {
    try {
      logger.info(`Getting wallet information for network: ${this.currentNetwork}`);
      
      const mockAddress = address || this.generateMockAddress();
      
      const walletInfo: MinaWalletInfo = {
        address: mockAddress,
        publicKey: this.generateMockPublicKey(),
        balance: {
          total: this.generateMockBalance(),
          liquid: this.generateMockBalance(),
          locked: (Math.random() * 100).toFixed(9)
        },
        nonce: Math.floor(Math.random() * 1000),
        network: this.currentNetwork,
        delegate: this.currentNetwork === 'mainnet' ? this.generateMockAddress() : undefined,
        lastActivity: new Date().toISOString()
      };
      
      logger.info(`Wallet info retrieved for: ${walletInfo.address} on ${this.currentNetwork}`);
      return walletInfo;
    } catch (error) {
      logger.error('Error getting wallet info:', error);
      throw error;
    }
  }

  async sendTransaction(params: {
    to: string;
    amount: string;
    fee?: string;
    memo?: string;
    from?: string;
  }): Promise<MinaTransaction> {
    try {
      logger.info(`Sending transaction on ${this.currentNetwork}: ${params.amount} MINA to ${params.to}`);
      
      const transaction: MinaTransaction = {
        hash: this.generateMockTxHash(),
        from: params.from || this.generateMockAddress(),
        to: params.to,
        amount: params.amount,
        fee: params.fee || '0.01',
        memo: params.memo,
        nonce: Math.floor(Math.random() * 1000),
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      
      logger.info(`Transaction submitted: ${transaction.hash}`);
      return transaction;
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw error;
    }
  }

  async getTransactionStatus(txHash: string): Promise<MinaTransaction | null> {
    try {
      logger.info(`Getting transaction status for: ${txHash} on ${this.currentNetwork}`);
      
      const transaction: MinaTransaction = {
        hash: txHash,
        from: this.generateMockAddress(),
        to: this.generateMockAddress(),
        amount: (Math.random() * 1000).toFixed(9),
        fee: '0.01',
        nonce: Math.floor(Math.random() * 1000),
        status: Math.random() > 0.3 ? 'included' : 'pending',
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
      };
      
      return transaction;
    } catch (error) {
      logger.error('Error getting transaction status:', error);
      throw error;
    }
  }

  async getFaucetTokens(address: string): Promise<{ success: boolean; txHash?: string; message: string }> {
    if (this.currentNetwork === 'mainnet') {
      return {
        success: false,
        message: 'Faucet not available on mainnet'
      };
    }

    if (!this.currentConfig.faucetUrl) {
      return {
        success: false,
        message: `Faucet not configured for ${this.currentNetwork}`
      };
    }

    try {
      logger.info(`Requesting faucet tokens for ${address} on ${this.currentNetwork}`);
      
      return {
        success: true,
        txHash: this.generateMockTxHash(),
        message: `Faucet tokens requested successfully on ${this.currentNetwork}`
      };
    } catch (error) {
      logger.error('Faucet request failed:', error);
      return {
        success: false,
        message: `Faucet request failed: ${error}`
      };
    }
  }

  private generateMockAddress(): string {
    const prefixes = {
      local: 'B62qk',
      devnet: 'B62qm',
      testnet: 'B62qn', 
      mainnet: 'B62qo'
    };
    
    const prefix = prefixes[this.currentNetwork];
    const suffix = Math.random().toString(36).substring(2, 47);
    return prefix + suffix;
  }

  private generateMockPublicKey(): string {
    return 'B62q' + Math.random().toString(36).substring(2, 47);
  }

  private generateMockBalance(): string {
    return (Math.random() * 10000).toFixed(9);
  }

  private generateMockTxHash(): string {
    return '5J' + Math.random().toString(36).substring(2, 47);
  }

  async validateAddress(address: string): Promise<boolean> {
    const minaAddressRegex = /^B62q[1-9A-HJ-NP-Za-km-z]{47,50}$/;
    return minaAddressRegex.test(address);
  }

  getExplorerUrl(txHash?: string, address?: string): string {
    const baseUrl = this.currentConfig.explorerUrl;
    
    if (txHash) {
      return `${baseUrl}/tx/${txHash}`;
    }
    
    if (address) {
      return `${baseUrl}/account/${address}`;
    }
    
    return baseUrl;
  }
}