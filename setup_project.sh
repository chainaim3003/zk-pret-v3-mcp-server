#!/bin/bash

# ZK-PRET MCP Server Project Setup Script
# This script creates the complete directory structure and essential files

set -e

PROJECT_NAME="pretmcpservermina"
echo "🚀 Setting up ZK-PRET MCP Server project: $PROJECT_NAME"

# Create main project directory
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/{server/tool-handlers,config,contracts/{base},services/{wallet,contracts,verification,proofs,testing},integrations,utils,types,data/{scf/{process,contracts},STABLECOIN/process,gleif,exim,actus,corporate}}
mkdir -p tests/{setup,helpers,unit/{contracts,services,server,utils},integration/{mcp-server,blockchain,external-services},e2e,zkpret-compatibility/{test-adapters,with-sign,test-data}}
mkdir -p scripts/{docker,ci}
mkdir -p config/{networks,contracts,mcp}
mkdir -p docs/{examples,api}
mkdir -p logs
mkdir -p build

echo "✅ Directory structure created!"

# Create .gitignore
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
build/
dist/
lib/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# TypeScript
*.tsbuildinfo

# Testing
coverage/
.nyc_output/

# Temporary folders
tmp/
temp/

# ZK-PRET specific
keys/
proofs/
circuits/
EOF

# Create ESLint config
echo "📝 Creating .eslintrc.json..."
cat > .eslintrc.json << 'EOF'
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "plugins": [
    "@typescript-eslint"
  ],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": ["build/", "dist/", "node_modules/"]
}
EOF

# Create Prettier config
echo "📝 Creating .prettierrc..."
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
EOF

# Create Jest config
echo "📝 Creating jest.config.js..."
cat > jest.config.js << 'EOF'
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/data/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-setup.ts'],
  testTimeout: 60000,
  maxWorkers: '50%',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@contracts/(.*)$': '<rootDir>/src/contracts/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
};
EOF

# Create Docker files
echo "🐳 Creating Docker configuration..."
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S zkpret && \
    adduser -S zkpret -u 1001 -G zkpret

# Change ownership
RUN chown -R zkpret:zkpret /app
USER zkpret

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]
EOF

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  zkpret-mcp-server:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MCP_TRANSPORT=sse
      - MINA_NETWORK=devnet
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - zkpret-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - zkpret-network

volumes:
  redis-data:

networks:
  zkpret-network:
    driver: bridge
EOF

# Create LICENSE
echo "📄 Creating LICENSE..."
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 ZK-PRET Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# Create CHANGELOG
echo "📄 Creating CHANGELOG.md..."
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to the ZK-PRET MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added
- Initial release of ZK-PRET MCP Server for Mina Protocol
- Model Context Protocol 1.7.0 integration
- STDIO and SSE transport support
- Multi-network Mina blockchain support (Local, Devnet, Testnet, Mainnet)
- Private key and browser wallet integration
- 70+ MCP tools for ZK-PRET operations
- Multi-level compliance verification
- GLEIF LEI verification integration
- Export-Import compliance verification
- BPMN 2.0 process verification
- ACTUS risk assessment framework
- Data integrity verification using DCSA standards
- Complete TypeScript implementation
- Comprehensive test suite
- Docker support
- CI/CD pipeline configuration
- Extensive documentation

### Security
- Secure private key handling
- Input validation with Zod schemas
- Rate limiting for API endpoints
- CORS protection
- Environment-based configuration
EOF

echo "✅ Project structure and configuration files created!"
echo ""
echo "🎯 Next steps:"
echo "1. Copy the main code files I provided in the chat"
echo "2. Run: npm install"
echo "3. Run: npm run build" 
echo "4. Configure your .env file"
echo "5. Run: npm start"
echo ""
echo "📁 Project created in: $(pwd)"
echo "🚀 You're ready to start building!"
EOF

chmod +x setup-project.sh
