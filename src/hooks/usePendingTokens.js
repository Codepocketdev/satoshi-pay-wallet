import { useState, useEffect } from 'react'
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts'
import { loadPendingTokens, savePendingTokens } from '../utils/storage.js'
import { vibrate } from '../utils/cashu.js'

export const usePendingTokens = (wallet, bip39Seed, updateTransactionStatus) => {
  const [pendingTokens, setPendingTokens] = useState([])

  useEffect(() => {
    const tokens = loadPendingTokens()
    setPendingTokens(tokens)
  }, [])

  useEffect(() => {
    if (pendingTokens.length === 0 || !wallet || !bip39Seed) return

    const checkPendingTokensSpending = async () => {
      for (const pending of pendingTokens) {
        try {
          if (!pending.proofs || pending.proofs.length === 0) continue

          const tokenAge = Date.now() - new Date(pending.timestamp).getTime()
          if (tokenAge < 10000) continue

          const mint = new CashuMint(pending.mintUrl)
          const tempWallet = new CashuWallet(mint, { bip39seed: bip39Seed })

          const spentStates = await tempWallet.checkProofsSpent(pending.proofs)

          const allSpent = spentStates.every(state => {
            return state.spentProof?.spent === true ||
                   state.spent === true ||
                   state.state === 'SPENT'
          })

          if (allSpent) {
            if (pending.txId) {
              updateTransactionStatus(pending.txId, 'paid')
            }

            const updated = pendingTokens.filter(t => t.id !== pending.id)
            setPendingTokens(updated)
            savePendingTokens(updated)

            vibrate([100, 50, 100])
            
            if (window.showSuccess) {
              window.showSuccess(`${pending.amount} sats token was claimed!`)
            }
          }
        } catch (err) {
          console.error(`Error checking token ${pending.id}:`, err)
        }
      }
    }

    const interval = setInterval(checkPendingTokensSpending, 30000)
    return () => clearInterval(interval)
  }, [pendingTokens, wallet, bip39Seed, updateTransactionStatus])

  const addPendingToken = (token, amount, mintUrl, proofs, txId) => {
    const pending = {
      id: Date.now(),
      token,
      amount,
      mintUrl,
      proofs,
      timestamp: new Date().toISOString(),
      txId
    }
    const updated = [pending, ...pendingTokens]
    setPendingTokens(updated)
    savePendingTokens(updated)
  }

  const removePendingToken = (tokenId) => {
    if (confirm('Delete this token? This cannot be undone.')) {
      const updated = pendingTokens.filter(t => t.id !== tokenId)
      setPendingTokens(updated)
      savePendingTokens(updated)
    }
  }

  const reclaimPendingToken = async (pendingToken, getProofs, saveProofs, calculateAllBalances, setError, setSuccess, setLoading) => {
    try {
      setLoading(true)
      setError('')

      const decoded = getDecodedToken(pendingToken.token)
      const tokenMintUrl = decoded.token[0]?.mint

      const targetMint = new CashuMint(tokenMintUrl)
      const targetWallet = new CashuWallet(targetMint, { bip39seed: bip39Seed })

      const proofs = await targetWallet.receive(pendingToken.token)

      if (proofs && proofs.length > 0) {
        const existingProofs = getProofs(tokenMintUrl)
        const allProofs = [...existingProofs, ...proofs]
        saveProofs(tokenMintUrl, allProofs)
        calculateAllBalances()

        const updated = pendingTokens.filter(t => t.id !== pendingToken.id)
        setPendingTokens(updated)
        savePendingTokens(updated)

        vibrate([200])

        setSuccess(`Reclaimed ${pendingToken.amount} sats!`)
        setTimeout(() => setSuccess(''), 2000)
      }
    } catch (err) {
      if (err.message?.includes('already spent') || err.message?.includes('already claimed')) {
        setError('Token already claimed by recipient')
        const updated = pendingTokens.filter(t => t.id !== pendingToken.id)
        setPendingTokens(updated)
        savePendingTokens(updated)
      } else {
        setError(`Could not reclaim: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    pendingTokens,
    addPendingToken,
    removePendingToken,
    reclaimPendingToken
  }
}
