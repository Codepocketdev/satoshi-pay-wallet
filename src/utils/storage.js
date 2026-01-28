import { db } from './dexieDB.js'
import { encryptProofs, decryptProofs } from './cashu.js'

// 🔥 PROOFS STORAGE (Dexie)
export const saveProofsForMint = async (mintUrl, proofs, masterKey = null) => {
  try {
    const validProofs = proofs.filter(p => p && p.amount && typeof p.amount === 'number')
    
    // Delete old proofs for this mint
    await db.proofs.where('mint').equals(mintUrl).delete()
    
    // Add new proofs
    const proofsToSave = validProofs.map(proof => ({
      ...proof,
      mint: mintUrl
    }))
    
    if (masterKey) {
      // For encryption, we'll still use a single encrypted blob per mint
      const encrypted = encryptProofs(validProofs, masterKey)
      await db.settings.put({
        key: `encrypted_proofs_${btoa(mintUrl)}`,
        value: encrypted
      })
    } else {
      await db.proofs.bulkPut(proofsToSave)
    }
    
    return { success: true }
  } catch (err) {
    console.error('Error saving proofs to Dexie:', err)
    return { success: false, error: err.message }
  }
}

export const getProofsForMint = async (mintUrl, masterKey = null) => {
  try {
    if (masterKey) {
      // Get encrypted proofs
      const setting = await db.settings.get(`encrypted_proofs_${btoa(mintUrl)}`)
      if (!setting) return []
      
      try {
        return decryptProofs(setting.value, masterKey)
      } catch (decryptErr) {
        console.log('Decryption failed')
        return []
      }
    }
    
    // Get proofs from Dexie
    const proofs = await db.proofs.where('mint').equals(mintUrl).toArray()
    return proofs.filter(p => p && p.amount)
  } catch (err) {
    console.error('Error loading proofs from Dexie:', err)
    return []
  }
}

// 🔥 TRANSACTIONS STORAGE (Dexie)
export const saveTransactions = async (transactions) => {
  try {
    await db.transactions.clear()
    await db.transactions.bulkPut(transactions)
  } catch (err) {
    console.error('Error saving transactions to Dexie:', err)
  }
}

export const loadTransactions = async () => {
  try {
    const transactions = await db.transactions.orderBy('timestamp').reverse().toArray()
    return transactions
  } catch (err) {
    console.error('Error loading transactions from Dexie:', err)
    return []
  }
}

export const addTransaction = async (transactions, type, amount, note, mintUrl, status = 'paid') => {
  const newTx = {
    id: Date.now(),
    type,
    amount,
    note,
    date: new Date().toISOString(),
    timestamp: Date.now(),
    mint: mintUrl,
    status
  }

  try {
    await db.transactions.put(newTx)
    return [newTx, ...transactions]  // <-- CHANGE THIS LINE
  } catch (err) {
    console.error('Error adding transaction to Dexie:', err)
    return [newTx, ...transactions]  // <-- CHANGE THIS LINE TOO
  }
}

// 🔥 PENDING TOKENS STORAGE (localStorage for instant access!)
export const savePendingTokens = async (tokens) => {
  try {
    localStorage.setItem('pending_tokens', JSON.stringify(tokens))
  } catch (err) {
    console.error('Error saving pending tokens:', err)
  }
}

export const loadPendingTokens = async () => {
  try {
    const saved = localStorage.getItem('pending_tokens')
    return saved ? JSON.parse(saved) : []
  } catch (err) {
    console.error('Error loading pending tokens:', err)
    return []
  }
}

// 🔥 MINT QUOTE STORAGE
export const savePendingQuote = async (quote, amount, mintUrl) => {
  try {
    await db.settings.put({
      key: 'pending_mint_quote',
      value: {
        quote,
        amount,
        mintUrl,
        timestamp: Date.now()
      }
    })
  } catch (err) {
    console.error('Error saving pending quote:', err)
  }
}

export const getPendingQuote = async () => {
  try {
    const setting = await db.settings.get('pending_mint_quote')
    return setting?.value || null
  } catch (err) {
    console.error('Error loading pending quote:', err)
    return null
  }
}

export const clearPendingQuote = async () => {
  try {
    await db.settings.delete('pending_mint_quote')
  } catch (err) {
    console.error('Error clearing pending quote:', err)
  }
}

// 🔥 HELPER FUNCTIONS
export const getAllProofs = async () => {
  try {
    return await db.proofs.toArray()
  } catch (err) {
    console.error('Error getting all proofs:', err)
    return []
  }
}

export const getProofsByMints = async (mintUrls) => {
  try {
    const proofs = await db.proofs.where('mint').anyOf(mintUrls).toArray()
    return proofs
  } catch (err) {
    console.error('Error getting proofs by mints:', err)
    return []
  }
}

// 🔥 TRANSACTION UPDATE
export const updateTransactionStatus = async (transactions, txId, newStatus) => {
  try {
    const tx = await db.transactions.get(txId)
    if (tx) {
      await db.transactions.update(txId, { status: newStatus })
    }
    return transactions.map(t => t.id === txId ? { ...t, status: newStatus } : t)
  } catch (err) {
    console.error('Error updating transaction status:', err)
    return transactions.map(t => t.id === txId ? { ...t, status: newStatus } : t)
  }
}

// 🔥 CUSTOM MINTS STORAGE
export const saveCustomMints = async (mints) => {
  try {
    await db.settings.put({
      key: 'custom_mints',
      value: mints
    })
  } catch (err) {
    console.error('Error saving custom mints:', err)
  }
}

export const loadCustomMints = async () => {
  try {
    const setting = await db.settings.get('custom_mints')
    return setting?.value || []
  } catch (err) {
    console.error('Error loading custom mints:', err)
    return []
  }
}

// 🔥 SEED PHRASE (keep in localStorage for security)
export const saveSeedPhrase = (seedPhrase) => {
  try {
    localStorage.setItem('wallet_seed', seedPhrase)
  } catch (err) {
    console.error('Error saving seed:', err)
  }
}

export const loadSeedPhrase = () => {
  try {
    return localStorage.getItem('wallet_seed')
  } catch (err) {
    console.error('Error loading seed:', err)
    return null
  }
}

// 🔥 MIGRATION HELPER (already migrated with migrateToDexie)
export const migrateFromLocalStorage = async () => {
  console.log('Migration already handled by migrateToDexie')
  return { success: true }
}

// 🔥 RESTORED TOKENS STORAGE (for manual claiming)
export const saveRestoredTokens = async (tokens) => {
  try {
    await db.settings.put({
      key: 'restored_tokens',
      value: tokens
    })
    console.log('✅ Saved restored tokens for manual claiming')
  } catch (err) {
    console.error('Error saving restored tokens:', err)
  }
}

export const getRestoredTokens = async () => {
  try {
    const setting = await db.settings.get('restored_tokens')
    return setting?.value || []
  } catch (err) {
    console.error('Error loading restored tokens:', err)
    return []
  }
}

// 🔥 CLEAR ALL DATA
export const clearAllData = async () => {
  try {
    await db.proofs.clear()
    await db.transactions.clear()
    await db.pendingTokens.clear()
    await db.settings.clear()
    localStorage.clear()
    console.log('All data cleared')
  } catch (err) {
    console.error('Error clearing data:', err)
  }
}
