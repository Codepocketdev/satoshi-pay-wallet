import { encryptProofs, decryptProofs } from './cashu.js'

// Check if localStorage is near quota
function isQuotaExceeded(err) {
  return err instanceof DOMException && (
    err.code === 22 ||
    err.code === 1014 ||
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  )
}

// Proofs Storage
export const saveProofsForMint = (mintUrl, proofs, masterKey = null) => {
  try {
    const validProofs = proofs.filter(p => p && p.amount && typeof p.amount === 'number')
    const key = `cashu_proofs_${btoa(mintUrl)}`

    if (masterKey) {
      const encrypted = encryptProofs(validProofs, masterKey)
      localStorage.setItem(key, encrypted)
    } else {
      localStorage.setItem(key, JSON.stringify(validProofs))
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

export const getProofsForMint = (mintUrl, masterKey = null) => {
  try {
    const key = `cashu_proofs_${btoa(mintUrl)}`
    const saved = localStorage.getItem(key)

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
    } else {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed.filter(p => p && p.amount) : []
    }
  } catch (err) {
    console.error('Error loading proofs:', err)
    return []
  }
}

// Transactions
export const loadTransactions = () => {
  try {
    const saved = localStorage.getItem('cashu_transactions')
    if (saved && saved !== 'undefined' && saved !== 'null') {
      return JSON.parse(saved)
    }
    return []
  } catch (err) {
    console.error('Error loading transactions:', err)
    return []
  }
}

export const saveTransactions = (transactions) => {
  localStorage.setItem('cashu_transactions', JSON.stringify(transactions))
}

export const addTransaction = (transactions, type, amount, note, mintUrl, status = 'paid') => {
  const tx = {
    id: Date.now(),
    type,
    amount,
    note,
    mint: mintUrl,
    timestamp: new Date().toISOString(),
    status
  }
  const updated = [tx, ...transactions]
  saveTransactions(updated)
  return { transactions: updated, txId: tx.id }
}

export const updateTransactionStatus = (transactions, txId, newStatus) => {
  const updated = transactions.map(tx =>
    tx.id === txId ? { ...tx, status: newStatus } : tx
  )
  saveTransactions(updated)
  return updated
}

// Pending Tokens
export const loadPendingTokens = () => {
  try {
    const saved = localStorage.getItem('pending_tokens')
    if (saved) {
      return JSON.parse(saved)
    }
    return []
  } catch (err) {
    console.error('Error loading pending tokens:', err)
    return []
  }
}

export const savePendingTokens = (pendingTokens) => {
  localStorage.setItem('pending_tokens', JSON.stringify(pendingTokens))
}

// Pending Quotes
export const savePendingQuote = (quote, amount, mintUrl) => {
  const pending = {
    quote: quote.quote,
    amount: amount,
    mintUrl: mintUrl,
    timestamp: Date.now(),
    request: quote.request
  }
  localStorage.setItem('pending_mint_quote', JSON.stringify(pending))
}

export const getPendingQuote = () => {
  try {
    const saved = localStorage.getItem('pending_mint_quote')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (err) {
    console.error('Error loading pending quote:', err)
  }
  return null
}

export const clearPendingQuote = () => {
  localStorage.removeItem('pending_mint_quote')
}

// Custom Mints
export const loadCustomMints = () => {
  try {
    const saved = localStorage.getItem('custom_mints')
    if (saved) {
      return JSON.parse(saved)
    }
    return []
  } catch (err) {
    console.error('Error loading custom mints:', err)
    return []
  }
}

export const saveCustomMints = (customMints) => {
  localStorage.setItem('custom_mints', JSON.stringify(customMints))
}
