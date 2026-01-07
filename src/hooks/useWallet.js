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
  saveCustomMints
} from '../utils/storage.js'

export const useWallet = () => {
  // Wallet state
  const [wallet, setWallet] = useState(null)
  const [mintUrl, setMintUrl] = useState(DEFAULT_MINTS[0].url)
  const [customMints, setCustomMints] = useState([])
  const [allMints, setAllMints] = useState(DEFAULT_MINTS)
  const [mintInfo, setMintInfo] = useState(null)

  // Balance
  const [balances, setBalances] = useState({})
  const [totalBalance, setTotalBalance] = useState(0)

  // Transactions
  const [transactions, setTransactions] = useState([])

  // Seed & Encryption
  const [seedPhrase, setSeedPhrase] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [bip39Seed, setBip39Seed] = useState(null)
  const [isNewWallet, setIsNewWallet] = useState(false)
  const [showSeedBackup, setShowSeedBackup] = useState(false)

  // UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Race condition prevention
  const isInitializing = useRef(false)

  // Initialize wallet
  useEffect(() => {
    const initializeWallet = async () => {
      const existingSeed = localStorage.getItem('wallet_seed')

      if (existingSeed) {
        const seed = deriveMasterKey(existingSeed)
        const encKey = deriveEncryptionKey(existingSeed)
        setBip39Seed(seed)
        setMasterKey(encKey)
        setSeedPhrase(existingSeed)
        loadCustomMintsData()
        initWallet()
        loadTxData()
        calculateAllBalances()
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
      calculateAllBalances()
    } catch (err) {
      console.error('Wallet init error:', err)
      setError(`Failed to connect to mint: ${err.message}`)
      setWallet(null)
    } finally {
      setLoading(false)
      isInitializing.current = false
    }
  }

  const calculateAllBalances = () => {
    const mintBalances = {}
    let total = 0

    allMints.forEach(mint => {
      const proofs = getProofsForMint(mint.url, masterKey)
      const balance = proofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      mintBalances[mint.url] = balance
      total += balance
    })

    setBalances(mintBalances)
    setTotalBalance(total)
  }

  const handleSeedBackupConfirm = () => {
    localStorage.setItem('wallet_seed', seedPhrase)
    localStorage.setItem('wallet_backed_up', 'true')
    const seed = deriveMasterKey(seedPhrase)
    const encKey = deriveEncryptionKey(seedPhrase)
    setBip39Seed(seed)
    setMasterKey(encKey)
    setShowSeedBackup(false)
    setIsNewWallet(false)
    loadCustomMintsData()
    initWallet()
    loadTxData()
    calculateAllBalances()
  }

  const handleRestoreWallet = async (restoredSeed) => {
    allMints.forEach(mint => {
      const key = `cashu_proofs_${btoa(mint.url)}`
      localStorage.removeItem(key)
    })
    localStorage.removeItem('cashu_transactions')
    localStorage.removeItem('pending_tokens')

    localStorage.setItem('wallet_seed', restoredSeed)
    localStorage.setItem('wallet_backed_up', 'true')
    setSeedPhrase(restoredSeed)

    const seed = deriveMasterKey(restoredSeed)
    const encKey = deriveEncryptionKey(restoredSeed)
    setBip39Seed(seed)
    setMasterKey(encKey)

    loadCustomMintsData()
    await initWallet()
    calculateAllBalances()

    setSuccess('✅ Wallet restored successfully!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const loadCustomMintsData = () => {
    const custom = loadCustomMints()
    setCustomMints(custom)
    setAllMints([...DEFAULT_MINTS, ...custom])
  }

  const addCustomMint = (name, url) => {
    if (!name || !url) {
      setError('Please enter both name and URL')
      return false
    }

    const newMint = { name, url }
    const updated = [...customMints, newMint]
    saveCustomMints(updated)
    setCustomMints(updated)
    setAllMints([...DEFAULT_MINTS, ...updated])

    setSuccess('Mint added!')
    setTimeout(() => setSuccess(''), 2000)
    return true
  }

  const removeCustomMint = (url) => {
    const updated = customMints.filter(m => m.url !== url)
    saveCustomMints(updated)
    setCustomMints(updated)
    setAllMints([...DEFAULT_MINTS, ...updated])
    setSuccess('Mint removed!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const resetMint = (specificMint = null) => {
    const targetMint = specificMint || mintUrl
    const key = `cashu_proofs_${btoa(targetMint)}`
    localStorage.removeItem(key)
    calculateAllBalances()
  }

  const loadTxData = () => {
    const txs = loadTransactions()
    setTransactions(txs)
  }

  const addTransaction = (type, amount, note, mint, status = 'paid') => {
    const { transactions: updated, txId } = addTx(transactions, type, amount, note, mint || mintUrl, status)
    setTransactions(updated)
    return txId
  }

  const updateTransactionStatus = (txId, newStatus) => {
    const updated = updateTxStatus(transactions, txId, newStatus)
    setTransactions(updated)
  }

  const getProofs = (url) => getProofsForMint(url, masterKey)
  const saveProofs = (url, proofs) => saveProofsForMint(url, proofs, masterKey)

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
