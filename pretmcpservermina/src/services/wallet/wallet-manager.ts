import { PrivateKey, PublicKey, Field, Signature, Mina, AccountUpdate } from 'o1js';
import { NetworkType, MinaNetworkConfig } from '../config/network-config.js';
import { logger } from '../utils/logger.js';

export interface WalletInfo {
  type: 'private_key' | 'browser';
  address: string;
  publicKey: PublicKey;
  network: NetworkType;
  balance: string;
  nonce: number;
  isConnected: boolean;
}

export interface BrowserWallet {
  requestAccounts(): Promise<string[]>;
  requestNetwork(): Promise<{ networkID: string }>;
  switchChain(params: { networkID: string }): Promise<void>;
  signTransaction(transaction: any): Promise<{ signature: any }>;
  signMessage(message: string): Promise<{ signature: string }>;
}

declare global {
  interface Window {
    mina?: BrowserWallet;
  }
}

export class WalletManager {
  private privateKey?: PrivateKey;
  private publicKey?: PublicKey;
  private currentNetwork: NetworkType = 'local';
  private browserWallet?: BrowserWallet;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Wallet Manager...');

      // Try to initialize with private key from environment
      const privateKeyEnv = process.env.MINA_PRIVATE_KEY;
      if (privateKeyEnv) {
        await this.initializePrivateKeyWallet(privateKeyEnv);
      }

      // Try to detect browser wallet
      await this.detectBrowserWallet();

      // Set default network
      const networkEnv = process.env.MINA_NETWORK as NetworkType;
      if (networkEnv && MinaNetworkConfig.isValidNetwork(networkEnv)) {
        await this.switchNetwork(networkEnv);
      }

      this.isInitialized = true;
      logger.info('Wallet Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Wallet Manager:', error);
      throw error;
    }
  }

  private async initializePrivateKeyWallet(privateKeyBase58: string): Promise<void> {
    try {
      this.privateKey = PrivateKey.fromBase58(privateKeyBase58);
      this.publicKey = this.privateKey.toPublicKey();
      
      logger.info('Private key wallet initialized', {
        address: this.publicKey.toBase58()
      });
    } catch (error) {
      logger.error('Failed to initialize private key wallet:', error);
      throw new Error('Invalid private key provided');
    }
  }

  private async detectBrowserWallet(): Promise<void> {
    try {
      // In a real browser environment, this would detect Auro Wallet or other Mina wallets
      // For MCP server, we'll simulate browser wallet functionality
      if (typeof window !== 'undefined' && window.mina) {
        this.browserWallet = window.mina;
        logger.info('Browser wallet detected');
      } else {
        // Simulate browser wallet for testing
        this.browserWallet = this.createMockBrowserWallet();
        logger.info('Mock browser wallet created for testing');
      }
    } catch (error) {
      logger.warn('Browser wallet detection failed:', error);
    }
  }

  private createMockBrowserWallet(): BrowserWallet {
    return {
      async requestAccounts() {
        const mockPrivateKey = PrivateKey.random();
        const mockPublicKey = mockPrivateKey.toPublicKey();
        return [mockPublicKey.toBase58()];
      },
      async requestNetwork() {
        return { networkID: 'mina:devnet' };
      },
      async switchChain(params) {
        logger.info('Mock browser wallet switching chain:', params);
      },
      async signTransaction(transaction) {
        const mockPrivateKey = PrivateKey.random();
        const signature = Signature.create(mockPrivateKey, [Field(1)]);
        return { signature };
      },
      async signMessage(message) {
        const mockPrivateKey = PrivateKey.random();
        const signature = Signature.create(mockPrivateKey, [Field.fromJSON(message)]);
        return { signature: signature.toBase58() };
      }
    };
  }

  async switchNetwork(network: NetworkType): Promise<void> {
    try {
      const config = MinaNetworkConfig.getConfig(network);
      
      // Configure Mina instance
      const Network = Mina.Network(config.graphqlEndpoint);
      Mina.setActiveInstance(Network);
      
      this.currentNetwork = network;
      
      logger.info(`Switched to ${network} network`, {
        graphqlEndpoint: config.graphqlEndpoint
      });
    } catch (error) {
      logger.error(`Failed to switch to ${network} network:`, error);
      throw error;
    }
  }

  async getWalletInfo(walletType?: 'private_key' | 'browser'): Promise<WalletInfo> {
    if (!this.isInitialized) {
      throw new Error('Wallet Manager not initialized');
    }

    try {
      let publicKey: PublicKey;
      let type: 'private_key' | 'browser';

      if (walletType === 'browser' || (!walletType && !this.privateKey && this.browserWallet)) {
        // Use browser wallet
        const accounts = await this.browserWallet!.requestAccounts();
        publicKey = PublicKey.fromBase58(accounts[0]);
        type = 'browser';
      } else if (this.privateKey) {
        // Use private key wallet
        publicKey = this.publicKey!;
        type = 'private_key';
      } else {
        throw new Error('No wallet available');
      }

      const address = publicKey.toBase58();
      
      // Get account info from network
      let balance = '0';
      let nonce = 0;
      
      try {
        const account = await Mina.getAccount(publicKey);
        balance = account.balance.toString();
        nonce = Number(account.nonce.toString());
      } catch (error) {
        logger.warn('Failed to fetch account info:', error);
      }

      return {
        type,
        address,
        publicKey,
        network: this.currentNetwork,
        balance,
        nonce,
        isConnected: true
      };
    } catch (error) {
      logger.error('Failed to get wallet info:', error);
      throw error;
    }
  }

  async signTransaction(transaction: any, walletType?: 'private_key' | 'browser'): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Wallet Manager not initialized');
    }

    try {
      if (walletType === 'browser' || (!walletType && !this.privateKey && this.browserWallet)) {
        // Use browser wallet
        return await this.browserWallet!.signTransaction(transaction);
      } else if (this.privateKey) {
        // Use private key wallet
        const signedTx = await transaction.sign([this.privateKey]);
        return signedTx;
      } else {
        throw new Error('No wallet available for signing');
      }
    } catch (error) {
      logger.error('Failed to sign transaction:', error);
      throw error;
    }
  }

  async signMessage(message: string, walletType?: 'private_key' | 'browser'): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Wallet Manager not initialized');
    }

    try {
      if (walletType === 'browser' || (!walletType && !this.privateKey && this.browserWallet)) {
        // Use browser wallet
        const result = await this.browserWallet!.signMessage(message);
        return result.signature;
      } else if (this.privateKey) {
        // Use private key wallet
        const messageFields = [Field.fromJSON(message)];
        const signature = Signature.create(this.privateKey, messageFields);
        return signature.toBase58();
      } else {
        throw new Error('No wallet available for signing');
      }
    } catch (error) {
      logger.error('Failed to sign message:', error);
      throw error;
    }
  }

  async sendTransaction(transaction: any, walletType?: 'private_key' | 'browser'): Promise<string> {
    try {
      // Sign the transaction
      const signedTx = await this.signTransaction(transaction, walletType);
      
      // Send to network
      const txHash = await signedTx.send();
      
      logger.info('Transaction sent successfully', { txHash });
      return txHash.hash();
    } catch (error) {
      logger.error('Failed to send transaction:', error);
      throw error;
    }
  }

  getCurrentNetwork(): NetworkType {
    return this.currentNetwork;
  }

  getPublicKey(walletType?: 'private_key' | 'browser'): PublicKey {
    if (walletType === 'private_key' || (!walletType && this.privateKey)) {
      if (!this.publicKey) {
        throw new Error('Private key wallet not initialized');
      }
      return this.publicKey;
    } else {
      throw new Error('Browser wallet public key retrieval not implemented for static access');
    }
  }

  hasPrivateKeyWallet(): boolean {
    return !!this.privateKey;
  }

  hasBrowserWallet(): boolean {
    return !!this.browserWallet;
  }

  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up Wallet Manager...');
      
      // Clear sensitive data
      this.privateKey = undefined;
      this.publicKey = undefined;
      this.browserWallet = undefined;
      this.isInitialized = false;
      
      logger.info('Wallet Manager cleanup completed');
    } catch (error) {
      logger.error('Error during Wallet Manager cleanup:', error);
    }
  }
}