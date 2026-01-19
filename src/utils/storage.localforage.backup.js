import localforage from 'localforage'
import { encryptProofs, decryptProofs } from './cashu.js'

// 🔥 CONFIGURE LOCALFORAGE
localforage.config({
  name: 'SatoshiPayWallet',
  storeName: 'cashu_data',
  description: 'Satoshi Pay Cashu Wallet Storage'
})

// Check if quota exceeded
function isQuotaExceeded(err) {
  return err instanceof DOMException && (
    err.code === 22 ||
    err.code === 1014 ||
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )
}

// 🔥 PROOFS STORAGE (ASYNC)
export const saveProofsForMint = async (mintUrl, proofs, masterKey = null) => {
  try {
    const validProofs = proofs.filter(p => p && p.amount && typeof p.amount === 'number')
    const key = `cashu_proofs_${btoa(mintUrl)}`

    if (masterKey) {
      const encrypted = encryptProofs(validProofs, masterKey)
      await localforage.setItem(key, encrypted)
    } else {
      await localforage.setItem(key, JSON.stringify(validProofs))
    }
    return { success: true }
  } catch (err) {
    console.error('Error saving proofs:', err)
    if (isQuotaExceeded(err)) {
      return { success: false, error: 'QUOTA_EXCEEDED' }
    }
    return { success: false, error: err.message }
  }
}

export const getProofsForMint = async (mintUrl, masterKey = null) => {
  try {
    const key = `cashu_proofs_${btoa(mintUrl)}`
    const saved = await localforage.getItem(key)

    if (!saved || saved === 'undefined' || saved === 'null') {
      return []
    }

    if (masterKey) {
      try {
        return decryptProofs(saved, masterKey)
      } catch (decryptErr) {
        console.log('Decryption failed, trying plain JSON...')
        const parsed = JSON.parse(saved)
        return Array.isArray(parsed) ? parsed.filter(p => p && p.amount) : []
      }
    }

    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
    return Array.isArray(parsed) ? parsed.filter(p => p && p.amount) : []
  } catch (err) {
    console.error('Error loading proofs:', err)
    return []
  }
}

// 🔥 TRANSACTIONS STORAGE
export const saveTransactions = async (transactions) => {
  try {
    await localforage.setItem('cashu_transactions', JSON.stringify(transactions))
  } catch (err) {
    console.error('Error saving transactions:', err)
  }
}

export const loadTransactions = async () => {
  try {
    const saved = await localforage.getItem('cashu_transactions')
    if (!saved) return []
    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Error loading transactions:', err)
    return []
  }
}

export const addTransaction = (transactions, type, amount, note, mintUrl, status = 'paid') => {
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
  const updated = [newTx, ...transactions]
  saveTransactions(updated)
  return { transactions: updated, txId: newTx.id }
}

export const updateTransactionStatus = (transactions, txId, newStatus) => {
  const updated = transactions.map(tx =>
    tx.id === txId ? { ...tx, status: newStatus } : tx
  )
  saveTransactions(updated)
  return updated
}

// 🔥 PENDING QUOTE STORAGE
export const savePendingQuote = async (quote, amount, mintUrl) => {
  try {
    await localforage.setItem('pending_mint_quote', JSON.stringify({
      quote: quote.quote || quote,
      amount,
      mintUrl,
      timestamp: Date.now()
    }))
  } catch (err) {
    console.error('Error saving pending quote:', err)
  }
}

export const getPendingQuote = async () => {
  try {
    const saved = await localforage.getItem('pending_mint_quote')
    if (!saved) return null
    return typeof saved === 'string' ? JSON.parse(saved) : saved
  } catch (err) {
    console.error('Error loading pending quote:', err)
    return null
  }
}

export const clearPendingQuote = async () => {
  try {
    await localforage.removeItem('pending_mint_quote')
  } catch (err) {
    console.error('Error clearing pending quote:', err)
  }
}

// 🔥 CUSTOM MINTS STORAGE
export const saveCustomMints = async (mints) => {
  try {
    await localforage.setItem('custom_mints', JSON.stringify(mints))
  } catch (err) {
    console.error('Error saving custom mints:', err)
  }
}

export const loadCustomMints = async () => {
  try {
    const saved = await localforage.getItem('custom_mints')
    if (!saved) return []
    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Error loading custom mints:', err)
    return []
  }
}

// 🔄 MIGRATION FROM LOCALSTORAGE (Run once on load)
export const migrateFromLocalStorage = async () => {
  try {
    // Check if already migrated
    const migrated = await localforage.getItem('migrated_from_localstorage')
    if (migrated) return

    console.log('🔄 Migrating from localStorage to LocalForage...')

    // Migrate proofs
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cashu_proofs_'))
    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value) {
        await localforage.setItem(key, value)
        console.log(`✅ Migrated ${key}`)
      }
    }

    // Migrate transactions
    const txs = localStorage.getItem('cashu_transactions')
    if (txs) {
      await localforage.setItem('cashu_transactions', txs)
      console.log('✅ Migrated transactions')
    }

    // Migrate pending quote
    const pending = localStorage.getItem('pending_mint_quote')
    if (pending) {
      await localforage.setItem('pending_mint_quote', pending)
      console.log('✅ Migrated pending quote')
    }

    // Migrate custom mints
    const mints = localStorage.getItem('custom_mints')
    if (mints) {
      await localforage.setItem('custom_mints', mints)
      console.log('✅ Migrated custom mints')
    }

    // Mark as migrated
    await localforage.setItem('migrated_from_localstorage', true)
    console.log('🎉 Migration complete!')

  } catch (err) {
    console.error('❌ Migration failed:', err)
  }
}

// 🧹 UTILITY: Clear all data
export const clearAllData = async () => {
  try {
    await localforage.clear()
    console.log('🧹 All data cleared')
  } catch (err) {
    console.error('Error clearing data:', err)
  }
}

// 🔥 ADD THESE NEW FUNCTIONS HERE ↓↓↓

// 🔥 SEED PHRASE STORAGE (keeping in localStorage for security)
export const saveSeedPhrase = (seedPhrase) => {
  localStorage.setItem('wallet_seed', seedPhrase)
}

export const loadSeedPhrase = () => {
  return localStorage.getItem('wallet_seed')
}

// 🔥 PENDING TOKENS STORAGE
export const savePendingTokens = async (tokens) => {
  try {
    await localforage.setItem('pending_tokens', JSON.stringify(tokens))
  } catch (err) {
    console.error('Error saving pending tokens:', err)
  }
}

export const loadPendingTokens = async () => {
  try {
    const saved = await localforage.getItem('pending_tokens')
    if (!saved) return []
    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Error loading pending tokens:', err)
    return []
  }
}

