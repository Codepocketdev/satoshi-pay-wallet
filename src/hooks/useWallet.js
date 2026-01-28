import { useState, useEffect, useRef } from 'react'
import { CashuMint, CashuWallet, CheckStateEnum, getEncodedToken } from '@cashu/cashu-ts'
import { hashToCurve } from '@cashu/crypto/modules/common'
import { useQueryClient } from '@tanstack/react-query'
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
  migrateFromLocalStorage,
  saveRestoredTokens,
  getRestoredTokens
} from '../utils/storage.js'
import {
  getBalanceSnapshot,
  saveBalanceSnapshot,
  markBalanceStale,
  clearBalanceSnapshot
} from '../utils/balanceDB.js'

export const useWallet = () => {
  const queryClient = useQueryClient()
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

  const getKeysetId = (walletInstance) => {
    try {
      if (walletInstance?.keys?.id) {
        return walletInstance.keys.id
      }
      if (walletInstance?.keysets && walletInstance.keysets.length > 0) {
        const activeKeyset = walletInstance.keysets.find(k => k.active)
        return activeKeyset?.id || walletInstance.keysets[0]?.id
      }
      return null
    } catch (err) {
      console.warn('Could not get keyset ID:', err)
      return null
    }
  }

  useEffect(() => {
    if (mintUrl) {
      localStorage.setItem('selected_mint_url', mintUrl)
    }
  }, [mintUrl])

  useEffect(() => {
    const initializeWallet = async () => {
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

      const newWallet = new CashuWallet(mint, {
        bip39seed: bip39Seed,
        unit: 'sat'
      })

      try {
        const info = await mint.getInfo()
        setMintInfo(info)
        await newWallet.getKeys()
        console.log('✅ Wallet initialized')
      } catch (infoError) {
        console.warn('Failed to fetch mint data:', infoError)
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
      console.log('✅ Balances calculated:', total)
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

  const handleRestoreWallet = async (restoredSeed, selectedMints, autoAdd, progressCallback) => {
    try {
      setLoading(true)
      setError('')

      console.log('Starting wallet restoration...')
      console.log('Auto-add:', autoAdd)

      const seed = deriveMasterKey(restoredSeed)
      const encKey = deriveEncryptionKey(restoredSeed)

      const BATCH_SIZE = 200
      const MAX_EMPTY_BATCHES = 2
      const mintsToScan = allMints.filter(m => selectedMints.includes(m.url))

      let totalRestoredSats = 0
      let totalRestoredProofs = 0
      let allRestoredTokens = []

      for (const mintToScan of mintsToScan) {
        try {
          progressCallback(mintToScan.url, 'scanning', { message: 'Connecting to mint...' })

          const scanMint = new CashuMint(mintToScan.url)
          const scanWallet = new CashuWallet(scanMint, { bip39seed: seed })
          const info = await scanMint.getInfo()

          const supportsRestore = info?.nuts?.['9']?.supported || info?.nuts?.['7']?.supported

          if (!supportsRestore) {
            progressCallback(mintToScan.url, 'done', {
              message: '⚠️ Mint does not support restore',
              totalSats: 0,
              proofCount: 0
            })
            continue
          }

          const keysetsData = await scanMint.getKeySets()
          const keysetIds = keysetsData.keysets || []
          let mintTotalSats = 0
          let mintTotalProofs = 0

          for (const keyset of keysetIds) {
            try {
              progressCallback(mintToScan.url, 'scanning', {
                message: `Scanning keyset ${keyset.id.substring(0, 12)}...`
              })

              const keysetWallet = new CashuWallet(scanMint, {
                bip39seed: seed,
                unit: keyset.unit
              })

              let start = 0
              let emptyBatchCount = 0
              let restoreProofs = []

              while (emptyBatchCount < MAX_EMPTY_BATCHES) {
                let proofs = []
                try {
                  const restoreResult = await keysetWallet.restore(start, BATCH_SIZE, { keysetId: keyset.id })
                  proofs = restoreResult?.proofs || []
                } catch (restoreErr) {
                  console.error('Restore error:', restoreErr)
                  proofs = []
                }

                if (proofs.length === 0) {
                  emptyBatchCount++
                } else {
                  console.log(`> Restored ${proofs.length} proofs with sum ${proofs.reduce((s, p) => s + p.amount, 0)}`)
                  restoreProofs = restoreProofs.concat(proofs)
                  emptyBatchCount = 0
                }

                start += BATCH_SIZE
              }

              if (restoreProofs.length > 0) {
                progressCallback(mintToScan.url, 'scanning', {
                  message: `Checking ${restoreProofs.length} proofs...`
                })

                let restoredProofs = []

                for (let i = 0; i < restoreProofs.length; i += BATCH_SIZE) {
                  const batch = restoreProofs.slice(i, i + BATCH_SIZE)
                  const proofStates = await keysetWallet.checkProofsStates(batch)

                  const enc = new TextEncoder()
                  const unspentProofStateYs = proofStates
                    .filter(ps => ps.state === CheckStateEnum.UNSPENT)
                    .map(ps => ps.Y)

                  const unspentProofs = batch.filter(p =>
                    unspentProofStateYs.includes(hashToCurve(enc.encode(p.secret)).toHex(true))
                  )

                  if (unspentProofs.length > 0) {
                    console.log(`Found ${unspentProofs.length} unspent proofs`)
                  }

                  const existingProofs = await getProofsForMint(mintToScan.url, encKey)
                  const newProofs = unspentProofs.filter(
                    p => !existingProofs.some(existing => existing.secret === p.secret)
                  )

                  restoredProofs = restoredProofs.concat(newProofs)
                }

                if (restoredProofs.length > 0) {
                  const amount = restoredProofs.reduce((sum, p) => sum + p.amount, 0)
                  mintTotalSats += amount
                  mintTotalProofs += restoredProofs.length

                  // Generate token string
                  const tokenString = getEncodedToken({
                    mint: mintToScan.url,
                    proofs: restoredProofs
                  })

                  allRestoredTokens.push({
                    mint: mintToScan.url,
                    mintName: mintToScan.name,
                    token: tokenString,
                    amount: amount,
                    proofCount: restoredProofs.length,
                    timestamp: Date.now()
                  })

                  console.log(`✅ Generated token for ${amount} sats`)
                }
              }
            } catch (keysetErr) {
              console.log(`Error restoring keyset ${keyset.id}:`, keysetErr.message)
            }
          }

          progressCallback(mintToScan.url, 'done', {
            message: mintTotalSats > 0 ? `✅ Found ${mintTotalSats} sats` : 'No unspent tokens found',
            totalSats: mintTotalSats,
            proofCount: mintTotalProofs
          })

          totalRestoredSats += mintTotalSats
          totalRestoredProofs += mintTotalProofs

        } catch (mintErr) {
          console.error(`Error scanning ${mintToScan.name}:`, mintErr)
          progressCallback(mintToScan.url, 'error', {
            message: `Error: ${mintErr.message}`,
            totalSats: 0,
            proofCount: 0
          })
        }
      }

      // Always save and pass tokens back
      if (allRestoredTokens.length > 0) {
        await saveRestoredTokens(allRestoredTokens)
        console.log(`💾 Saved ${allRestoredTokens.length} token groups`)
        
        // Pass tokens in final callback
        progressCallback('__TOKENS__', 'complete', {
          tokens: allRestoredTokens,
          autoAdd: autoAdd
        })
      }

      console.log('🔄 Reloading proofs from storage...')
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await calculateAllBalances()
      queryClient.invalidateQueries()

      console.log(`✅ Wallet restoration complete! Total: ${totalRestoredSats} sats`)

      if (totalRestoredSats > 0) {
        if (autoAdd) {
          setSuccess(`✅ Added ${totalRestoredSats} sats (${totalRestoredProofs} proofs) to wallet!`)
        } else {
          setSuccess(`✅ Found ${totalRestoredSats} sats (${totalRestoredProofs} proofs) ready to claim!`)
        }
        setTimeout(() => setSuccess(''), 3000)
      }

      setLoading(false)

    } catch (err) {
      console.error('Restore failed:', err)
      setError(`Failed to restore wallet: ${err.message}`)
      setLoading(false)
      throw err
    }
  }

  const claimRestoredTokens = async () => {
    try {
      setLoading(true)
      const restoredTokens = await getRestoredTokens()
      
      if (!restoredTokens || restoredTokens.length === 0) {
        setError('No tokens to claim')
        setLoading(false)
        return
      }

      for (const tokenGroup of restoredTokens) {
        await saveProofsForMint(tokenGroup.mint, tokenGroup.proofs, masterKey)
      }

      // Clear restored tokens
      await saveRestoredTokens([])

      await calculateAllBalances()
      queryClient.invalidateQueries()

      const totalAmount = restoredTokens.reduce((sum, t) => sum + t.amount, 0)
      setSuccess(`✅ Added ${totalAmount} sats to wallet!`)
      setTimeout(() => setSuccess(''), 3000)

      setLoading(false)
    } catch (err) {
      console.error('Claim failed:', err)
      setError(`Failed to claim tokens: ${err.message}`)
      setLoading(false)
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

    // Check for duplicates
    const isDuplicate = allMints.some(m => m.url === url)
    if (isDuplicate) {
      setError('This mint is already added!')
      setTimeout(() => setError(''), 2000)
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
    const currentTxs = await loadTransactions()
    const updated = await addTx(currentTxs, type, amount, note, mint || mintUrl, status)
    setTransactions(updated)
    await saveTransactions(updated)
    return updated[updated.length - 1]?.id
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
    claimRestoredTokens,
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
