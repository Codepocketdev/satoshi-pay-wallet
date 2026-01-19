import Dexie from 'dexie'

// Define the database schema
export class CashuWalletDB extends Dexie {
  constructor() {
    super('SatoshiPayWallet')

    this.version(3).stores({  // Increment version to 3
      // Proofs table: auto-increment primary key to avoid duplicates
      proofs: 'secret, mint, amount, id, C',

      // Transactions table: indexed by id and timestamp
      transactions: 'id, timestamp, type, mint, status',

      // Pending tokens table: indexed by id
      pendingTokens: 'id, timestamp, mintUrl',

      // NEW: Mint quotes table - track all mint quotes
      mintQuotes: 'id, state, mintUrl, expiresAt',

      // Settings/Config table: key-value pairs
      settings: 'key'
    })
  }
}

// Create singleton instance
export const db = new CashuWalletDB()

// Migration flag (stored in localStorage)
export const getMigrationStatus = () => {
  return localStorage.getItem('dexie_migrated') === 'true'
}

export const setMigrationStatus = (status) => {
  localStorage.setItem('dexie_migrated', status.toString())
}
