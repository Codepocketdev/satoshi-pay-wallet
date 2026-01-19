import { db, getMigrationStatus, setMigrationStatus } from './dexieDB.js'
import localforage from 'localforage'

// Migrate proofs from localforage to Dexie
export const migrateProofsToDexie = async () => {
  console.log('🔄 Starting proofs migration to Dexie...')
  
  try {
    // Get all keys from localforage
    const keys = await localforage.keys()
    const proofKeys = keys.filter(k => k.startsWith('cashu_proofs_'))
    
    let totalProofs = 0
    
    for (const key of proofKeys) {
      // Extract mint URL from key
      const base64Mint = key.replace('cashu_proofs_', '')
      const mintUrl = atob(base64Mint)
      
      // Get proofs from localforage
      const saved = await localforage.getItem(key)
      if (!saved) continue
      
      const proofs = typeof saved === 'string' ? JSON.parse(saved) : saved
      if (!Array.isArray(proofs)) continue
      
      // Add mint URL to each proof and insert into Dexie
      for (const proof of proofs) {
        if (proof && proof.amount && proof.secret) {
          await db.proofs.put({
            ...proof,
            mint: mintUrl
          })
          totalProofs++
        }
      }
    }
    
    console.log(`✅ Migrated ${totalProofs} proofs`)
    return totalProofs
  } catch (err) {
    console.error('❌ Proofs migration failed:', err)
    throw err
  }
}

// Migrate transactions from localforage to Dexie
export const migrateTransactionsToDexie = async () => {
  console.log('🔄 Starting transactions migration to Dexie...')
  
  try {
    const saved = await localforage.getItem('cashu_transactions')
    if (!saved) {
      console.log('No transactions to migrate')
      return 0
    }
    
    const transactions = typeof saved === 'string' ? JSON.parse(saved) : saved
    if (!Array.isArray(transactions)) return 0
    
    // Insert all transactions into Dexie
    await db.transactions.bulkPut(transactions)
    
    console.log(`✅ Migrated ${transactions.length} transactions`)
    return transactions.length
  } catch (err) {
    console.error('❌ Transactions migration failed:', err)
    throw err
  }
}

// Migrate pending tokens
export const migratePendingTokensToDexie = async () => {
  console.log('🔄 Starting pending tokens migration to Dexie...')
  
  try {
    const saved = await localforage.getItem('pending_tokens')
    if (!saved) {
      console.log('No pending tokens to migrate')
      return 0
    }
    
    const tokens = typeof saved === 'string' ? JSON.parse(saved) : saved
    if (!Array.isArray(tokens)) return 0
    
    await db.pendingTokens.bulkPut(tokens)
    
    console.log(`✅ Migrated ${tokens.length} pending tokens`)
    return tokens.length
  } catch (err) {
    console.error('❌ Pending tokens migration failed:', err)
    throw err
  }
}

// Main migration function
export const migrateToDexie = async () => {
  if (getMigrationStatus()) {
    console.log('✅ Already migrated to Dexie')
    return { success: true, alreadyMigrated: true }
  }
  
  try {
    console.log('🚀 Starting full migration to Dexie...')
    
    const proofsCount = await migrateProofsToDexie()
    const txCount = await migrateTransactionsToDexie()
    const pendingCount = await migratePendingTokensToDexie()
    
    // Mark migration as complete
    setMigrationStatus(true)
    
    console.log('🎉 Migration complete!')
    console.log(`   - ${proofsCount} proofs`)
    console.log(`   - ${txCount} transactions`)
    console.log(`   - ${pendingCount} pending tokens`)
    
    return {
      success: true,
      alreadyMigrated: false,
      counts: {
        proofs: proofsCount,
        transactions: txCount,
        pendingTokens: pendingCount
      }
    }
  } catch (err) {
    console.error('❌ Migration failed:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
