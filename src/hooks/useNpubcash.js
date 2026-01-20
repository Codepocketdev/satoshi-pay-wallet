import { useState, useEffect, useCallback } from 'react'
import { getNpubcashBalance, claimNpubcashToken, getLightningAddress } from '../utils/npubcash.js'

const POLL_INTERVAL = 30000 // 30 seconds

export function useNpubcash({
  nsec,
  enabled = false,
  onTokenClaimed
}) {
  const [lightningAddress, setLightningAddress] = useState('')
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [claimedTokens, setClaimedTokens] = useState([])

  // Read auto-claim setting from localStorage (default true)
  const autoClaim = typeof window !== 'undefined'
    ? localStorage.getItem('npubcash_autoclaim') !== 'false'
    : true

  // Load claimed tokens from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('npubcash_claimed_tokens')
      if (saved) {
        try {
          setClaimedTokens(JSON.parse(saved))
        } catch (err) {
          console.error('Failed to load claimed tokens:', err)
        }
      }
    }
  }, [])

  // Save claimed tokens to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('npubcash_claimed_tokens', JSON.stringify(claimedTokens))
    }
  }, [claimedTokens])

  // Get Lightning Address on mount
  useEffect(() => {
    if (!nsec || !enabled) return

    getLightningAddress(nsec)
      .then(address => {
        if (address) {
          setLightningAddress(address)
        }
      })
      .catch(err => {
        console.error('Failed to get Lightning Address:', err)
      })
  }, [nsec, enabled])

  // Check balance and claim if available
  const checkAndClaim = useCallback(async () => {
    if (!nsec || !enabled || loading) return

    try {
      setLoading(true)
      setError(null)

      // Check balance
      const currentBalance = await getNpubcashBalance(nsec)
      setBalance(currentBalance)

      // ALWAYS claim if balance > 0 (regardless of autoClaim setting)
      if (currentBalance > 0) {
        console.log(`💰 Found ${currentBalance} sats on npub.cash, claiming...`)

        const result = await claimNpubcashToken(nsec)

        if (result.error) {
          setError(result.error)
          return
        }

        if (result.token) {
          setBalance(0) // Reset balance after claiming

          if (autoClaim) {
            // AUTO-RECEIVE: Pass token immediately to parent
            console.log('✅ Auto-claim ON: Auto-receiving token')
            if (onTokenClaimed) {
              onTokenClaimed(result.token, currentBalance)
            }
          } else {
            // MANUAL MODE: Store token for later
            console.log('⏸️ Auto-claim OFF: Token stored for manual receive')
            const newToken = {
              id: Date.now(),
              token: result.token,
              amount: currentBalance,
              timestamp: new Date().toISOString()
            }
            setClaimedTokens(prev => [...prev, newToken])
          }
        }
      }
    } catch (err) {
      console.error('npub.cash polling error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [nsec, enabled, loading, autoClaim, onTokenClaimed])

  // Receive a specific claimed token
  const receiveToken = useCallback((tokenId) => {
    const token = claimedTokens.find(t => t.id === tokenId)
    if (token && onTokenClaimed) {
      onTokenClaimed(token.token, token.amount)
      // Remove from claimed tokens list
      setClaimedTokens(prev => prev.filter(t => t.id !== tokenId))
    }
  }, [claimedTokens, onTokenClaimed])

  // Delete a claimed token without receiving
  const deleteToken = useCallback((tokenId) => {
    setClaimedTokens(prev => prev.filter(t => t.id !== tokenId))
  }, [])

  // Manual claim function
  const manualClaim = useCallback(async () => {
    if (!nsec || !enabled) return

    try {
      setLoading(true)
      setError(null)

      const result = await claimNpubcashToken(nsec)

      if (result.error) {
        setError(result.error)
        return { success: false, error: result.error }
      }

      if (result.token) {
        setBalance(0)
        return { success: true, token: result.token }
      }

      return { success: false, error: 'No token received' }
    } catch (err) {
      console.error('Manual claim error:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [nsec, enabled])

  // Polling effect
  useEffect(() => {
    if (!enabled) return

    // Check immediately on mount
    checkAndClaim()

    // Then poll every 30 seconds
    const interval = setInterval(checkAndClaim, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [enabled, checkAndClaim])

  return {
    lightningAddress,
    balance,
    loading,
    error,
    claimedTokens,
    manualClaim,
    receiveToken,
    deleteToken,
    refresh: checkAndClaim
  }
}
