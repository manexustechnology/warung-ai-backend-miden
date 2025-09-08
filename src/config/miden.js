// Miden Network Configuration
export const MIDEN_CONFIG = {
  // Network configuration
  NETWORKS: {
    TESTNET: {
      name: 'Testnet',
      rpcUrl: process.env.MIDEN_RPC_URL || 'https://testnet.miden.io',
      explorerUrl: process.env.MIDEN_EXPLORER_URL || 'https://explorer.testnet.miden.io',
      faucetUrl: process.env.MIDEN_FAUCET_URL || 'https://faucet.testnet.miden.io',
      chainId: 'testnet',
      isTestnet: true
    },
    MAINNET: {
      name: 'Mainnet',
      rpcUrl: process.env.MIDEN_RPC_URL || 'https://mainnet.miden.io',
      explorerUrl: process.env.MIDEN_EXPLORER_URL || 'https://explorer.miden.io',
      chainId: 'mainnet',
      isTestnet: false
    }
  },

  // Get current network based on environment
  getCurrentNetwork() {
    const network = process.env.MIDEN_NETWORK || 'testnet';
    return this.NETWORKS[network.toUpperCase()] || this.NETWORKS.TESTNET;
  },

  // DeFi pool configuration
  POOLS: {
    MIDEN: {
      poolId: process.env.MIDEN_FINANCE_POOL_ID || 'miden-pool',
      name: 'MIDEN Lending Pool',
      asset: 'MIDEN',
      defaultApy: 6.5,
      minDeposit: 1,
      maxDeposit: 1000000
    },
    USDC: {
      poolId: process.env.MIDEN_DEFI_USDC_POOL_ID || 'usdc-pool',
      name: 'USDC Lending Pool',
      asset: 'USDC',
      defaultApy: 4.2,
      minDeposit: 1,
      maxDeposit: 1000000
    }
  },

  // Transaction configuration
  TRANSACTIONS: {
    maxAmount: 1000000, // Maximum transaction amount in MIDEN
    minAmount: 0.001,   // Minimum transaction amount in MIDEN
    gasLimit: 300000,   // Gas limit for transactions
    confirmations: 12   // Required confirmations
  },

  // Wallet configuration
  WALLET: {
    supportedTypes: ['miden-extension', 'miden-mobile'],
    defaultTimeout: 30000, // 30 seconds
    maxRetries: 3
  },

  // API endpoints
  ENDPOINTS: {
    health: '/health',
    balance: '/balance',
    transaction: '/transaction',
    pool: '/pool'
  }
};

// Miden utility functions
export const MIDEN_UTILS = {
  // Format MIDEN amount
  formatAmount(amount, decimals = 6) {
    return Number(amount).toFixed(decimals);
  },

  // Validate MIDEN address
  isValidAddress(address) {
    // MIDEN addresses typically start with specific prefixes
    // This is a basic validation - adjust based on actual MIDEN address format
    return address && typeof address === 'string' && address.length >= 20;
  },

  // Validate transaction hash
  isValidTxHash(txHash) {
    return txHash && typeof txHash === 'string' && txHash.length >= 32;
  },

  // Get explorer URL for transaction
  getExplorerUrl(txHash, network = 'testnet') {
    const baseUrl = MIDEN_CONFIG.NETWORKS[network.toUpperCase()]?.explorerUrl;
    return baseUrl ? `${baseUrl}/tx/${txHash}` : null;
  },

  // Get faucet URL for testnet
  getFaucetUrl() {
    return MIDEN_CONFIG.NETWORKS.TESTNET.faucetUrl;
  }
};

// Miden error messages
export const MIDEN_ERRORS = {
  INVALID_ADDRESS: 'Invalid MIDEN address provided',
  INVALID_AMOUNT: 'Invalid amount provided',
  INSUFFICIENT_BALANCE: 'Insufficient balance for transaction',
  TRANSACTION_FAILED: 'Transaction failed to process',
  NETWORK_ERROR: 'Network connection error',
  TIMEOUT_ERROR: 'Transaction timeout',
  INVALID_TX_HASH: 'Invalid transaction hash',
  POOL_NOT_FOUND: 'DeFi pool not found',
  INSUFFICIENT_LIQUIDITY: 'Insufficient liquidity in pool'
};

// Export default configuration
export default MIDEN_CONFIG;
