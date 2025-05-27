import { z } from 'zod';
import { logger } from '../../utils/logger.js';

// Configuration schema validation
const AppConfigSchema = z.object({
  // Server Configuration
  server: z.object({
    name: z.string().default('zkpret-mcp-server-mina'),
    version: z.string().default('1.0.0'),
    environment: z.enum(['development', 'production', 'test']).default('development'),
    logLevel: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info')
  }),

  // MCP Configuration
  mcp: z.object({
    transport: z.enum(['stdio', 'sse']).default('stdio'),
    sse: z.object({
      port: z.number().min(1000).max(65535).default(3001),
      host: z.string().default('localhost'),
      corsOrigin: z.string().or(z.array(z.string())).default('*')
    })
  }),

  // Mina Network Configuration
  mina: z.object({
    network: z.enum(['local', 'devnet', 'testnet', 'mainnet']).default('local'),
    privateKey: z.string().optional(),
    walletType: z.enum(['private_key', 'browser']).default('private_key')
  }),

  // External Services Configuration
  services: z.object({
    gleif: z.object({
      apiUrl: z.string().url().default('https://api.gleif.org/api/v1'),
      apiKey: z.string().optional(),
      timeout: z.number().default(30000)
    }),
    actus: z.object({
      serverUrl: z.string().url().default('http://98.84.165.146:8083'),
      localUrl: z.string().url().default('http://localhost:8083'),
      mode: z.enum(['remote', 'local']).default('remote'),
      timeout: z.number().default(60000)
    }),
    docker: z.object({
      enabled: z.boolean().default(true),
      host: z.string().default('unix:///var/run/docker.sock')
    })
  }),

  // Security Configuration
  security: z.object({
    jwtSecret: z.string().optional(),
    apiRateLimit: z.number().default(100),
    apiRateWindow: z.number().default(900000), // 15 minutes
    enableCors: z.boolean().default(true)
  }),

  // Performance Configuration
  performance: z.object({
    cacheEnabled: z.boolean().default(true),
    cacheTtl: z.number().default(3600), // 1 hour
    maxConcurrentRequests: z.number().default(50),
    requestTimeout: z.number().default(30000)
  }),

  // Testing Configuration
  testing: z.object({
    network: z.enum(['local', 'devnet', 'testnet']).default('local'),
    timeout: z.number().default(60000),
    parallel: z.boolean().default(false),
    enableMockServices: z.boolean().default(false)
  }),

  // Monitoring Configuration
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsPort: z.number().default(9090),
    healthCheckInterval: z.number().default(30000)
  }),

  // Database Configuration (optional)
  database: z.object({
    type: z.enum(['memory', 'sqlite', 'postgres']).default('memory'),
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    name: z.string().default('zkpret_mcp'),
    user: z.string().default('zkpret'),
    password: z.string().default(''),
    url: z.string().optional()
  }).optional()
});

export type AppConfigType = z.infer<typeof AppConfigSchema>;

export class AppConfig {
  private static instance: AppConfig;
  private config: AppConfigType;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  private loadConfig(): AppConfigType {
    try {
      // Load from environment variables
      const envConfig = {
        server: {
          name: process.env.SERVER_NAME,
          version: process.env.npm_package_version,
          environment: process.env.NODE_ENV,
          logLevel: process.env.LOG_LEVEL
        },
        mcp: {
          transport: process.env.MCP_TRANSPORT,
          sse: {
            port: process.env.SSE_PORT ? parseInt(process.env.SSE_PORT) : undefined,
            host: process.env.SSE_HOST,
            corsOrigin: process.env.CORS_ORIGIN?.split(',') || process.env.CORS_ORIGIN
          }
        },
        mina: {
          network: process.env.MINA_NETWORK,
          privateKey: process.env.MINA_PRIVATE_KEY,
          walletType: process.env.WALLET_TYPE
        },
        services: {
          gleif: {
            apiUrl: process.env.GLEIF_API_URL,
            apiKey: process.env.GLEIF_API_KEY,
            timeout: process.env.GLEIF_TIMEOUT ? parseInt(process.env.GLEIF_TIMEOUT) : undefined
          },
          actus: {
            serverUrl: process.env.ACTUS_SERVER_URL,
            localUrl: process.env.ACTUS_SERVER_LOCAL,
            mode: process.env.ACTUS_SERVER_MODE,
            timeout: process.env.ACTUS_TIMEOUT ? parseInt(process.env.ACTUS_TIMEOUT) : undefined
          },
          docker: {
            enabled: process.env.DOCKER_ENABLED === 'true',
            host: process.env.DOCKER_HOST
          }
        },
        security: {
          jwtSecret: process.env.JWT_SECRET,
          apiRateLimit: process.env.API_RATE_LIMIT ? parseInt(process.env.API_RATE_LIMIT) : undefined,
          apiRateWindow: process.env.API_RATE_WINDOW ? parseInt(process.env.API_RATE_WINDOW) : undefined,
          enableCors: process.env.ENABLE_CORS !== 'false'
        },
        performance: {
          cacheEnabled: process.env.CACHE_ENABLED !== 'false',
          cacheTtl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : undefined,
          maxConcurrentRequests: process.env.MAX_CONCURRENT_REQUESTS ? parseInt(process.env.MAX_CONCURRENT_REQUESTS) : undefined,
          requestTimeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT) : undefined
        },
        testing: {
          network: process.env.TEST_NETWORK,
          timeout: process.env.TEST_TIMEOUT ? parseInt(process.env.TEST_TIMEOUT) : undefined,
          parallel: process.env.TEST_PARALLEL === 'true',
          enableMockServices: process.env.ENABLE_MOCK_SERVICES === 'true'
        },
        monitoring: {
          enableMetrics: process.env.ENABLE_METRICS !== 'false',
          metricsPort: process.env.METRICS_PORT ? parseInt(process.env.METRICS_PORT) : undefined,
          healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL ? parseInt(process.env.HEALTH_CHECK_INTERVAL) : undefined
        },
        database: process.env.DB_TYPE ? {
          type: process.env.DB_TYPE,
          host: process.env.DB_HOST,
          port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
          name: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          url: process.env.DATABASE_URL
        } : undefined
      };

      // Remove undefined values
      const cleanConfig = this.removeUndefined(envConfig);

      // Validate and parse configuration
      const validatedConfig = AppConfigSchema.parse(cleanConfig);

      logger.info('Configuration loaded successfully', {
        environment: validatedConfig.server.environment,
        network: validatedConfig.mina.network,
        transport: validatedConfig.mcp.transport
      });

      return validatedConfig;

    } catch (error) {
      logger.error('Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private removeUndefined(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = this.removeUndefined(value);
      }
    }
    return result;
  }

  // Getter methods for easy access
  public get server() {
    return this.config.server;
  }

  public get mcp() {
    return this.config.mcp;
  }

  public get mina() {
    return this.config.mina;
  }

  public get services() {
    return this.config.services;
  }

  public get security() {
    return this.config.security;
  }

  public get performance() {
    return this.config.performance;
  }

  public get testing() {
    return this.config.testing;
  }

  public get monitoring() {
    return this.config.monitoring;
  }

  public get database() {
    return this.config.database;
  }

  // Full configuration access
  public getConfig(): AppConfigType {
    return { ...this.config };
  }

  // Environment checks
  public isDevelopment(): boolean {
    return this.config.server.environment === 'development';
  }

  public isProduction(): boolean {
    return this.config.server.environment === 'production';
  }

  public isTest(): boolean {
    return this.config.server.environment === 'test';
  }

  // Network checks
  public isMainnet(): boolean {
    return this.config.mina.network === 'mainnet';
  }

  public isTestnet(): boolean {
    return this.config.mina.network === 'testnet';
  }

  public isDevnet(): boolean {
    return this.config.mina.network === 'devnet';
  }

  public isLocal(): boolean {
    return this.config.mina.network === 'local';
  }

  // Service URLs
  public getGleifApiUrl(): string {
    return this.config.services.gleif.apiUrl;
  }

  public getActusServerUrl(): string {
    return this.config.services.actus.mode === 'local'
      ? this.config.services.actus.localUrl
      : this.config.services.actus.serverUrl;
  }

  // Update configuration (for runtime changes)
  public updateConfig(updates: Partial<AppConfigType>): void {
    try {
      const newConfig = { ...this.config, ...updates };
      const validatedConfig = AppConfigSchema.parse(newConfig);
      this.config = validatedConfig;
      
      logger.info('Configuration updated successfully');
    } catch (error) {
      logger.error('Configuration update failed:', error);
      throw new Error(`Invalid configuration update: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Validate current configuration
  public validate(): boolean {
    try {
      AppConfigSchema.parse(this.config);
      return true;
    } catch (error) {
      logger.error('Configuration validation failed:', error);
      return false;
    }
  }

  // Get configuration as JSON string
  public toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // Get sanitized configuration (removes sensitive data)
  public getSanitizedConfig(): Partial<AppConfigType> {
    const sanitized = { ...this.config };
    
    // Remove sensitive information
    if (sanitized.mina) {
      delete (sanitized.mina as any).privateKey;
    }
    if (sanitized.services?.gleif) {
      delete (sanitized.services.gleif as any).apiKey;
    }
    if (sanitized.security) {
      delete (sanitized.security as any).jwtSecret;
    }
    if (sanitized.database) {
      delete (sanitized.database as any).password;
      delete (sanitized.database as any).url;
    }

    return sanitized;
  }
}