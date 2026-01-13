import { useState, useEffect } from 'react'
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts'
import { vibrate } from '../utils/cashu.js'
import { ArrowDownToLine, Wallet, CheckCircle, FileDown, Key, Lock } from 'lucide-react'
import { 
  loadP2PKKeys, 
  getP2PKSettings, 
  isLocked, 
  isLockedToUs, 
  getPrivateKeyForP2PKToken,
  setPrivateKeyUsed
} from '../utils/p2pk.js'
import P2PKKeyPage from './P2PKKeyPage.jsx'

export default function ReceivePage({
  wallet,
  bip39Seed,
  allMints,
  totalBalance,
  getProofs,
  saveProofs,
  calculateAllBalances,
  addTransaction,
  scannedData,
  error,
  success,
  setError,
  setSuccess,
  loading,
  setLoading,
  onClose,
  onScanRequest,
  onNavigate
}) {
  const [receiveMethod, setReceiveMethod] = useState(null)
  const [receiveToken, setReceiveToken] = useState('')
  const [showP2PKQuickAccess, setShowP2PKQuickAccess] = useState(false)
  const [p2pkKeys, setP2pkKeys] = useState([])
  const [tokenLockStatus, setTokenLockStatus] = useState(null)
  const [showP2PKKeyPage, setShowP2PKKeyPage] = useState(false)

  // Load P2PK settings and keys
  useEffect(() => {
    const settings = getP2PKSettings()
    setShowP2PKQuickAccess(settings.showQuickAccess)
    const keys = loadP2PKKeys()
    setP2pkKeys(keys)
  }, [])

  // Check token lock status when token changes
  useEffect(() => {
    if (!receiveToken) {
      setTokenLockStatus(null)
      return
    }

    try {
      const decoded = getDecodedToken(receiveToken.trim())
      if (!decoded || !decoded.token || !decoded.token[0]) {
        setTokenLockStatus(null)
        return
      }

      const proofs = decoded.token[0].proofs
      
      if (isLocked(proofs)) {
        if (isLockedToUs(proofs)) {
          setTokenLockStatus('locked-to-us')
          console.log('[P2PK] Token is locked to one of our keys!')
        } else {
          setTokenLockStatus('locked-other')
          console.log('[P2PK] Token is locked but not to our keys')
        }
      } else {
        setTokenLockStatus('unlocked')
        console.log('[P2PK] Token is not locked')
      }
    } catch (err) {
      setTokenLockStatus(null)
    }
  }, [receiveToken])

  // Auto-populate from scanned data
  useEffect(() => {
    if (scannedData) {
      const data = scannedData.trim()
      const dataLower = data.toLowerCase()
      
      try {
        const decoded = getDecodedToken(data)
        
        if (decoded && decoded.token && decoded.token.length > 0) {
          setReceiveMethod('ecash')
          setReceiveToken(data)
          setSuccess('✓ Cashu token detected!')
          
          setTimeout(() => {
            handleReceiveEcash()
          }, 500)
          return
        }
      } catch (err) {
        // Not a cashu token
      }
      
      if (dataLower.startsWith('ln')) {
        setError('Cannot receive Lightning invoices directly. Use "Get Tokens" on main page.')
        setTimeout(() => {
          resetReceivePage()
        }, 3000)
        return
      }
      
      setError('Unknown QR code format. Please scan a Cashu token.')
      setTimeout(() => {
        setError('')
      }, 3000)
    }
  }, [scannedData])

  const resetReceivePage = () => {
    setReceiveMethod(null)
    setReceiveToken('')
    setError('')
    setSuccess('')
    setTokenLockStatus(null)
  }

  const handleReceiveEcash = async () => {
    if (!receiveToken) return

    try {
      setLoading(true)
      setError('')

      const cleanToken = receiveToken.trim()

      let decoded
      try {
        decoded = getDecodedToken(cleanToken)
      } catch (decodeErr) {
        throw new Error(`Cannot read token. Make sure you copied the entire token.`)
      }

      const detectedMintUrl = decoded.token[0]?.mint

      if (!detectedMintUrl) {
        throw new Error('Token does not contain mint information')
      }

      const hasMint = allMints.some(m => m.url === detectedMintUrl)

      if (!hasMint) {
        throw new Error(`Token is from unknown mint: ${detectedMintUrl}\n\nAdd this mint in Settings first.`)
      }

      const targetMint = new CashuMint(detectedMintUrl)
      const targetWallet = new CashuWallet(targetMint, { bip39seed: bip39Seed })

      const proofs = decoded.token[0].proofs
      let receiveOptions = {}

      if (isLocked(proofs)) {
        if (!isLockedToUs(proofs)) {
          throw new Error('This token is locked to a different key. You cannot receive it.')
        }

        const privateKey = getPrivateKeyForP2PKToken(cleanToken)
        
        if (!privateKey) {
          throw new Error('Token is locked but no matching private key found. Cannot receive.')
        }

        receiveOptions.privkey = privateKey
        setPrivateKeyUsed(privateKey)
      }

      const receivedProofs = await targetWallet.receive(decoded, receiveOptions)

      if (!receivedProofs || receivedProofs.length === 0) {
        throw new Error('Token already claimed or invalid.')
      }

      const existingProofs = await getProofs(detectedMintUrl)
      const allProofs = [...existingProofs, ...receivedProofs]

      const validProofs = allProofs.filter(p => p && p.amount && typeof p.amount === 'number')
      await saveProofs(detectedMintUrl, validProofs)

      calculateAllBalances()

      const receivedAmount = receivedProofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      
      const txNote = isLocked(proofs) 
        ? 'P2PK-locked ecash received' 
        : 'Ecash token received'
      
      addTransaction('receive', receivedAmount, txNote, detectedMintUrl)

      vibrate([200])

      const successMsg = isLocked(proofs)
        ? `🔓 Unlocked & received ${receivedAmount} sats!`
        : `Received ${receivedAmount} sats!`
      
      setSuccess(successMsg)
      setReceiveToken('')

      setTimeout(() => {
        resetReceivePage()
        onClose()
      }, 2000)

    } catch (err) {
      if (err.message.includes('already spent') || err.message.includes('already claimed')) {
        setError('Token already claimed or spent')
      } else {
        setError(`${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleP2PKQuickAccess = () => {
    if (p2pkKeys.length === 0) {
      // No keys, navigate to P2PK settings
      if (onNavigate) {
        onNavigate('p2pk-settings')
      }
    } else {
      // Show P2PK key page
      setShowP2PKKeyPage(true)
    }
  }

  const handleGoToP2PKSettings = () => {
    setShowP2PKKeyPage(false)
    if (onNavigate) {
      onNavigate('p2pk-settings')
    }
  }

  // Show P2PK Key Page
  if (showP2PKKeyPage && p2pkKeys.length > 0) {
    const latestKey = p2pkKeys[p2pkKeys.length - 1]
    return (
      <P2PKKeyPage
        keyData={latestKey}
        onClose={() => setShowP2PKKeyPage(false)}
        onGoToSettings={handleGoToP2PKSettings}
        setSuccess={setSuccess}
      />
    )
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={() => {
          resetReceivePage()
          onClose()
        }}>← Back</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <ArrowDownToLine size={24} /> Receive
        </h1>
      </header>

      <div className="card balance-card-small">
        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#FF8C00' }}>{totalBalance} sats</div>
        <div style={{ fontSize: '0.85em', opacity: 0.6 }}>Current Balance</div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {!receiveMethod ? (
        <div className="card">
          <h3>Choose Receive Method</h3>
          <p style={{ marginBottom: '1em', opacity: 0.8 }}>How do you want to receive?</p>

          <button
            className="primary-btn"
            style={{ marginBottom: '0.5em', background: '#4CAF50' }}
            onClick={() => onScanRequest('receive')}
          >
            <span style={{ fontSize: '1.2em', marginRight: '0.5em' }}>⌘</span> Scan Token
          </button>

          <button className="primary-btn" style={{ marginBottom: '0.5em' }} onClick={() => setReceiveMethod('ecash')}>
            <FileDown size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Paste Ecash Token
          </button>
          
          <button className="secondary-btn" onClick={() => setReceiveMethod('lightning')}>
            ⚡ Receive via Lightning
          </button>

          {/* P2PK Quick Access Button */}
          {showP2PKQuickAccess && (
            <button
              className="secondary-btn"
              onClick={handleP2PKQuickAccess}
              style={{
                marginTop: '0.5em',
                background: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
                borderColor: '#A855F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5em'
              }}
            >
              <Key size={18} />
              {p2pkKeys.length > 0 ? 'Show P2PK Key' : 'Setup P2PK Key'}
            </button>
          )}
        </div>
      ) : receiveMethod === 'ecash' ? (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <Wallet size={20} /> Receive Ecash
          </h3>
          <p style={{ marginBottom: '1em' }}>
            Paste a Cashu token
          </p>

          {/* Token Lock Status - ONLY show for locked tokens */}
          {tokenLockStatus && tokenLockStatus !== 'unlocked' && (
            <div style={{
              marginBottom: '1em',
              padding: '0.8em',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5em',
              fontSize: '0.85em',
              ...(tokenLockStatus === 'locked-to-us' ? {
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid #8B5CF6',
                color: '#A855F7'
              } : {
                background: 'rgba(255, 165, 0, 0.1)',
                border: '1px solid #FFA500',
                color: '#FFA500'
              })
            }}>
              {tokenLockStatus === 'locked-to-us' ? (
                <>
                  <Key size={16} />
                  <span>🔓 Token locked to your key - will auto-unlock</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>⚠️ Token locked to different key - cannot receive</span>
                </>
              )}
            </div>
          )}

          <div className="token-box">
            <textarea
              placeholder="Paste token here..."
              value={receiveToken}
              onChange={(e) => setReceiveToken(e.target.value)}
              rows={6}
            />
          </div>
          <button 
            className="primary-btn" 
            onClick={handleReceiveEcash} 
            disabled={loading || !receiveToken || tokenLockStatus === 'locked-other'}
          >
            {loading ? 'Receiving...' : tokenLockStatus === 'locked-to-us' ? '🔓 Unlock & Receive' : 'Receive Token'}
          </button>

          <button className="back-btn" style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }} onClick={resetReceivePage}>
            ← Change Method
          </button>
        </div>
      ) : (
        <div className="card">
          <h3>⚡ Receive Lightning</h3>
          <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.7 }}>
            Use "Get Tokens" on the main page.
          </p>
          <button className="back-btn" style={{ position: 'relative', left: 0, transform: 'none' }} onClick={resetReceivePage}>
            ← Change Method
          </button>
        </div>
      )}
    </div>
  )
}

