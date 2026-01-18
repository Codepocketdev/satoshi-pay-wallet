import { useState, useEffect } from 'react'
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts'
import { loadPendingTokens, savePendingTokens } from '../utils/storage.js'
import { vibrate } from '../utils/cashu.js'

export const usePendingTokens = (wallet, bip39Seed, updateTransactionStatus) => {
  const [pendingTokens, setPendingTokens] = useState([])

  useEffect(() => {
    // 🔥 FIX: Add async/await
    const loadTokens = async () => {
      const tokens = await loadPendingTokens()
      setPendingTokens(tokens)
    }
    loadTokens()
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
            // 🔥 FIX: Add await
            await savePendingTokens(updated)

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

  const addPendingToken = async (token, amount, mintUrl, proofs, txId) => {
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
    // 🔥 FIX: Add await
    await savePendingTokens(updated)
  }

  const removePendingToken = async (tokenId) => {
    if (confirm('Delete this token? This cannot be undone.')) {
      const updated = pendingTokens.filter(t => t.id !== tokenId)
      setPendingTokens(updated)
      // 🔥 FIX: Add await
      await savePendingTokens(updated)
    }
  }

  const reclaimPendingToken = async (pendingToken, getProofs, saveProofs, calculateAllBalances, setError, setSuccess, setLoading) => {
  try {
    setLoading(true)
    setError('')

    // 🔍 STEP 1: Decode the token
    const decoded = getDecodedToken(pendingToken.token)
    console.log('🔍 Decoded token:', decoded) // Debug log
    
    // 🔧 STEP 2: Handle different token structures in 2.7.4
    let tokenMintUrl
    
    if (decoded.token && Array.isArray(decoded.token)) {
      // Old format: { token: [{mint: "...", proofs: [...]}] }
      tokenMintUrl = decoded.token[0]?.mint
    } else if (decoded.mint) {
      // New format: { mint: "...", proofs: [...] }
      tokenMintUrl = decoded.mint
    } else if (Array.isArray(decoded)) {
      // Direct array: [{mint: "...", proofs: [...]}]
      tokenMintUrl = decoded[0]?.mint
    }
    
    if (!tokenMintUrl) {
      throw new Error('Could not find mint URL in token')
    }
    
    console.log('✅ Mint URL:', tokenMintUrl) // Debug log

    // 🔧 STEP 3: Create wallet
    const targetMint = new CashuMint(tokenMintUrl)
    const targetWallet = new CashuWallet(targetMint, { bip39seed: bip39Seed })

    // 🔧 STEP 4: Receive with new 2.7.4 syntax
    const proofs = await targetWallet.receive(pendingToken.token, {
      counter: 0,
      proofsWeHave: await getProofs(tokenMintUrl)
    })

    if (proofs && proofs.length > 0) {
      const existingProofs = await getProofs(tokenMintUrl)
      const allProofs = [...existingProofs, ...proofs]
      await saveProofs(tokenMintUrl, allProofs)
      await calculateAllBalances()

      const updated = pendingTokens.filter(t => t.id !== pendingToken.id)
      setPendingTokens(updated)
      await savePendingTokens(updated)

      vibrate([200])

      setSuccess(`✅ Reclaimed ${pendingToken.amount} sats!`)
      setTimeout(() => setSuccess(''), 2000)
    }
  } catch (err) {
    console.error('❌ Reclaim error:', err) // Debug log
    if (err.message?.includes('already spent') || err.message?.includes('already claimed')) {
      setError('Token already claimed by recipient')
      const updated = pendingTokens.filter(t => t.id !== pendingToken.id)
      setPendingTokens(updated)
      await savePendingTokens(updated)
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

