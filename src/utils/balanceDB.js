// Balance Database - Fast balance persistence
// Separate from proofs for instant loading

const BALANCE_DB_KEY = 'satoshi_pay_balance_db'

// Balance snapshot structure
export const getBalanceSnapshot = () => {
  try {
    const saved = localStorage.getItem(BALANCE_DB_KEY)
    if (saved) {
      const snapshot = JSON.parse(saved)
      console.log('📊 Balance snapshot loaded:', snapshot.total, 'sats')
      return snapshot
    }
  } catch (err) {
    console.error('Failed to load balance snapshot:', err)
  }
  return null
}

export const saveBalanceSnapshot = (total, perMint) => {
  try {
    const snapshot = {
      total,
      perMint,
      lastUpdated: Date.now(),
      isStale: false
    }
    localStorage.setItem(BALANCE_DB_KEY, JSON.stringify(snapshot))
    console.log('💾 Balance snapshot saved:', total, 'sats')
  } catch (err) {
    console.error('Failed to save balance snapshot:', err)
  }
}

export const markBalanceStale = () => {
  try {
    const saved = localStorage.getItem(BALANCE_DB_KEY)
    if (saved) {
      const snapshot = JSON.parse(saved)
      snapshot.isStale = true
      localStorage.setItem(BALANCE_DB_KEY, JSON.stringify(snapshot))
      console.log('⚠️ Balance marked as stale')
    }
  } catch (err) {
    console.error('Failed to mark balance stale:', err)
  }
}

export const clearBalanceSnapshot = () => {
  try {
    localStorage.removeItem(BALANCE_DB_KEY)
    console.log('🗑️ Balance snapshot cleared')
  } catch (err) {
    console.error('Failed to clear balance snapshot:', err)
  }
}

// Check if snapshot is too old (> 24 hours)
export const isBalanceSnapshotExpired = (snapshot) => {
  if (!snapshot) return true
  const age = Date.now() - snapshot.lastUpdated
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  return age > maxAge
}

