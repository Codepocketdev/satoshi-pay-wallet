import { useState, useEffect, useRef } from 'react'
import { CashuMint, CashuWallet } from '@cashu/cashu-ts'
import {
  generateWalletSeed,
  deriveMasterKey,
  deriveEncryptionKey,
  DEFAULT_MINTS
} from '../utils/cashu.js'
import {
  saveProofsForMint,
  getProofsForMint,
  loadTransactions,
  saveTransactions,
  addTransaction as addTx,
  updateTransactionStatus as updateTxStatus,
  loadCustomMints,
  saveCustomMints,
  migrateFromLocalStorage
} from '../utils/storage.js'
import {
  getBalanceSnapshot,
  saveBalanceSnapshot,
  markBalanceStale,
  clearBalanceSnapshot
} from '../utils/balanceDB.js'

export const useWallet = () => {
  const [wallet, setWallet] = useState(null)
  const [mintUrl, setMintUrl] = useState(() => {
    const saved = localStorage.getItem('selected_mint_url')
    return saved || DEFAULT_MINTS[0].url
  })
  const [customMints, setCustomMints] = useState([])
  const [allMints, setAllMints] = useState(DEFAULT_MINTS)
  const [mintInfo, setMintInfo] = useState(null)

  const [balances, setBalances] = useState(() => {
    const snapshot = getBalanceSnapshot()
    return snapshot?.perMint || {}
  })
  const [totalBalance, setTotalBalance] = useState(() => {
    const snapshot = getBalanceSnapshot()
    return snapshot?.total || 0
  })

  const [transactions, setTransactions] = useState([])
  const [seedPhrase, setSeedPhrase] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [bip39Seed, setBip39Seed] = useState(null)
  const [isNewWallet, setIsNewWallet] = useState(false)
  const [showSeedBackup, setShowSeedBackup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const isInitializing = useRef(false)

  useEffect(() => {
    if (mintUrl) {
      localStorage.setItem('selected_mint_url', mintUrl)
    }
  }, [mintUrl])

  useEffect(() => {
    const initializeWallet = async () => {
      // 🔥 MIGRATE FROM LOCALSTORAGE FIRST
      await migrateFromLocalStorage()

      const existingSeed = localStorage.getItem('wallet_seed')

      if (existingSeed) {
        const seed = deriveMasterKey(existingSeed)
        const encKey = deriveEncryptionKey(existingSeed)
        setBip39Seed(seed)
        setMasterKey(encKey)
        setSeedPhrase(existingSeed)
        await loadCustomMintsData()
        initWallet()
        await loadTxData()
      } else {
        const newSeed = generateWalletSeed()
        setSeedPhrase(newSeed)
        localStorage.setItem('wallet_seed', newSeed)
        setIsNewWallet(true)
        setTimeout(() => setShowSeedBackup(true), 200)
      }
    }

    initializeWallet()
  }, [])

  useEffect(() => {
    if (mintUrl && bip39Seed) {
      initWallet()
    }
  }, [mintUrl, bip39Seed])

  const initWallet = async () => {
    if (isInitializing.current) {
      console.log('Init already in progress, skipping...')
      return
    }

    isInitializing.current = true

    try {
      setLoading(true)
      setError('')

      const mint = new CashuMint(mintUrl)
      const newWallet = new CashuWallet(mint, { bip39seed: bip39Seed })

      try {
        const info = await mint.getInfo()
        setMintInfo(info)
      } catch (infoError) {
        console.warn('Failed to fetch mint info:', infoError)
        setMintInfo({ name: 'Mint', nuts: {} })
      }

      setWallet(newWallet)
    } catch (err) {
      console.error('Wallet init error:', err)
      setError(`Failed to connect to mint: ${err.message}`)
      setWallet(null)
    } finally {
      setLoading(false)
      isInitializing.current = false
    }
  }

  const calculateAllBalances = async () => {
    try {
      const mintBalances = {}
      let total = 0

      for (const mint of allMints) {
        try {
          const proofs = await getProofsForMint(mint.url, masterKey)
          const balance = proofs.reduce((sum, p) => sum + (p.amount || 0), 0)
          mintBalances[mint.url] = balance
          total += balance
        } catch (err) {
          console.error(`Error calculating balance for ${mint.name}:`, err)
          mintBalances[mint.url] = 0
        }
      }

      setBalances(mintBalances)
      setTotalBalance(total)

      saveBalanceSnapshot(total, mintBalances)

      console.log('✅ Balances calculated and saved:', total)
    } catch (err) {
      console.error('Balance calculation error:', err)
    }
  }

  const handleSeedBackupConfirm = async () => {
    localStorage.setItem('wallet_seed', seedPhrase)
    localStorage.setItem('wallet_backed_up', 'true')
    const seed = deriveMasterKey(seedPhrase)
    const encKey = deriveEncryptionKey(seedPhrase)
    setBip39Seed(seed)
    setMasterKey(encKey)
    setShowSeedBackup(false)
    setIsNewWallet(false)
    await loadCustomMintsData()
    initWallet()
    await loadTxData()
    await calculateAllBalances()
  }

  const handleRestoreWallet = async (restoredSeed) => {
    try {
      setLoading(true)
      setError('')

      console.log('Starting wallet restoration...')

      const seed = deriveMasterKey(restoredSeed)
      const encKey = deriveEncryptionKey(restoredSeed)

      localStorage.removeItem('cashu_transactions')
      localStorage.removeItem('pending_tokens')
      clearBalanceSnapshot()

      localStorage.setItem('wallet_seed', restoredSeed)
      localStorage.setItem('wallet_backed_up', 'true')
      setSeedPhrase(restoredSeed)
      setBip39Seed(seed)
      setMasterKey(encKey)

      await loadCustomMintsData()

      const mint = new CashuMint(mintUrl)
      const newWallet = new CashuWallet(mint, { bip39seed: seed })
      setWallet(newWallet)

      console.log('Wallet initialized with restored seed')
      console.log('Scanning mints for tokens...')

      let totalRestored = 0
      const allMintsToScan = [...DEFAULT_MINTS, ...customMints]

      for (const mintToScan of allMintsToScan) {
        try {
          console.log(`Scanning ${mintToScan.name}...`)

          const scanMint = new CashuMint(mintToScan.url)
          const scanWallet = new CashuWallet(scanMint, { bip39seed: seed })
          const info = await scanMint.getInfo()

          if (info?.nuts?.['7']?.supported) {
            try {
              const keysetIds = info.keysets || []

              for (const keysetId of keysetIds) {
                try {
                  const restoredProofs = await scanWallet.restore(0, 5, { keysetId })

                  if (restoredProofs && restoredProofs.length > 0) {
                    await saveProofsForMint(mintToScan.url, restoredProofs, encKey)

                    const amount = restoredProofs.reduce((sum, p) => sum + p.amount, 0)
                    totalRestored += amount

                    console.log(`Restored ${amount} sats from ${mintToScan.name}`)
                  }
                } catch (keysetErr) {
                  console.log(`No tokens in keyset ${keysetId}`)
                }
              }
            } catch (restoreErr) {
              console.log(`Could not restore from ${mintToScan.name}:`, restoreErr.message)
            }
          } else {
            console.log(`${mintToScan.name} does not support NUT-07 restore`)
          }

        } catch (mintErr) {
          console.log(`Error scanning ${mintToScan.name}:`, mintErr.message)
        }
      }

      await calculateAllBalances()

      console.log(`Wallet restoration complete. Restored ${totalRestored} sats total.`)

      setSuccess(`Wallet restored successfully! Found ${totalRestored} sats.`)
      setTimeout(() => setSuccess(''), 5000)

      setLoading(false)

    } catch (err) {
      console.error('Restoration error:', err)
      setError(`Restoration failed: ${err.message}`)
      setLoading(false)
      throw err
    }
  }

  const loadCustomMintsData = async () => {
    const custom = await loadCustomMints()
    setCustomMints(custom)
    setAllMints([...DEFAULT_MINTS, ...custom])
  }

  const addCustomMint = async (name, url) => {
    if (!name || !url) {
      setError('Please enter both name and URL')
      return false
    }

    const newMint = { name, url }
    const updated = [...customMints, newMint]
    await saveCustomMints(updated)
    setCustomMints(updated)
    setAllMints([...DEFAULT_MINTS, ...updated])

    setSuccess('Mint added!')
    setTimeout(() => setSuccess(''), 2000)
    return true
  }

  const removeCustomMint = async (url) => {
    const updated = customMints.filter(m => m.url !== url)
    await saveCustomMints(updated)
    setCustomMints(updated)
    setAllMints([...DEFAULT_MINTS, ...updated])
    setSuccess('Mint removed!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const resetMint = async (specificMint = null) => {
    const targetMint = specificMint || mintUrl
    const key = `cashu_proofs_${btoa(targetMint)}`
    localStorage.removeItem(key)
    markBalanceStale()
    await calculateAllBalances()
  }

  const loadTxData = async () => {
    const txs = await loadTransactions()
    setTransactions(txs)
  }

  const addTransaction = async (type, amount, note, mint, status = 'paid') => {
    const { transactions: updated, txId } = addTx(transactions, type, amount, note, mint || mintUrl, status)
    setTransactions(updated)
    await saveTransactions(updated)
    return txId
  }

  const updateTransactionStatus = async (txId, newStatus) => {
    const updated = updateTxStatus(transactions, txId, newStatus)
    setTransactions(updated)
    await saveTransactions(updated)
  }

  const getProofs = async (url) => await getProofsForMint(url, masterKey)

  const saveProofs = async (url, proofs) => {
    await saveProofsForMint(url, proofs, masterKey)
    markBalanceStale()
    await calculateAllBalances()
  }

  return {
    wallet,
    mintUrl,
    setMintUrl,
    customMints,
    allMints,
    mintInfo,
    balances,
    totalBalance,
    currentMintBalance: balances[mintUrl] || 0,
    calculateAllBalances,
    transactions,
    addTransaction,
    updateTransactionStatus,
    seedPhrase,
    setSeedPhrase,
    isNewWallet,
    showSeedBackup,
    setShowSeedBackup,
    handleSeedBackupConfirm,
    handleRestoreWallet,
    masterKey,
    bip39Seed,
    addCustomMint,
    removeCustomMint,
    resetMint,
    getProofs,
    saveProofs,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess
  }
}

