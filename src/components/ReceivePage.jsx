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
import ReceiveLightning from './ReceiveLightning.jsx'

export default function ReceivePage({
  wallet,
  bip39Seed,
  allMints,
  totalBalance,
  getProofs,
  saveProofs,
  calculateAllBalances,
  addTransaction,
  onAddMint,
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
  const [lightningToken, setLightningToken] = useState('')
  const [showP2PKQuickAccess, setShowP2PKQuickAccess] = useState(false)
  const [p2pkKeys, setP2pkKeys] = useState([])
  const [tokenLockStatus, setTokenLockStatus] = useState(null)
  const [showP2PKKeyPage, setShowP2PKKeyPage] = useState(false)

  // Unknown mint handling
  const [unknownMintToken, setUnknownMintToken] = useState(null)
  const [unknownMintUrl, setUnknownMintUrl] = useState(null)
  const [unknownMintName, setUnknownMintName] = useState(null)
  const [showUnknownMintPrompt, setShowUnknownMintPrompt] = useState(false)
  const [mintAdded, setMintAdded] = useState(false)

  useEffect(() => {
    const settings = getP2PKSettings()
    setShowP2PKQuickAccess(settings.showQuickAccess)
    const keys = loadP2PKKeys()
    setP2pkKeys(keys)
  }, [])

  useEffect(() => {
    if (!receiveToken) {
      setTokenLockStatus(null)
      return
    }

    try {
      let tokenForCheck = receiveToken.trim()
      if (tokenForCheck.toLowerCase().startsWith('cashu')) {
        if (tokenForCheck.startsWith('cashu:')) {
          tokenForCheck = tokenForCheck.substring(6)
          if (tokenForCheck.startsWith('//')) {
            tokenForCheck = tokenForCheck.substring(2)
          }
        } else {
          tokenForCheck = tokenForCheck.substring(5)
        }
      }

      const decoded = getDecodedToken(tokenForCheck)
      console.log('Decoded for lock check:', decoded)

      let proofs

      if (decoded.token && Array.isArray(decoded.token)) {
        proofs = decoded.token[0]?.proofs
      } else if (decoded.proofs) {
        proofs = decoded.proofs
      } else if (Array.isArray(decoded)) {
        proofs = decoded[0]?.proofs
      }

      if (!proofs || proofs.length === 0) {
        console.log('No proofs found')
        setTokenLockStatus(null)
        return
      }

      console.log('Checking lock status for proofs:', proofs)

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
      console.error('Lock check error:', err)
      setTokenLockStatus(null)
    }
  }, [receiveToken])

  useEffect(() => {
    if (scannedData) {
      const data = scannedData.trim()
      const dataLower = data.toLowerCase()

      try {
        let tokenForDecode = data
        if (tokenForDecode.toLowerCase().startsWith('cashu')) {
          if (tokenForDecode.startsWith('cashu:')) {
            tokenForDecode = tokenForDecode.substring(6)
            if (tokenForDecode.startsWith('//')) {
              tokenForDecode = tokenForDecode.substring(2)
            }
          } else {
            tokenForDecode = tokenForDecode.substring(5)
          }
        }

        const decoded = getDecodedToken(tokenForDecode)
        console.log('Scanned token decoded:', decoded)

        let isValidToken = false

        if (decoded.token && Array.isArray(decoded.token) && decoded.token.length > 0) {
          console.log('V3 token detected from scan')
          isValidToken = true
        } else if (decoded.mint && decoded.proofs) {
          console.log('V4 token detected from scan')
          isValidToken = true
        } else if (Array.isArray(decoded) && decoded.length > 0 && decoded[0].proofs) {
          console.log('Array format token detected from scan')
          isValidToken = true
        }

        if (isValidToken) {
          setReceiveMethod('ecash')
          setReceiveToken(data)
          setError('')
          setSuccess('Cashu token detected!')
          return
        }
      } catch (err) {
        console.log('Not a cashu token:', err)
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

const handleReceiveLightning = async (token) => {
    // Separate handler for Lightning Address tokens - doesn't use textarea state
    if (!token) return

    const tokenString = typeof token === 'string' ? token : String(token)

    try {
      setLoading(true)
      setError('')

      const cleanToken = tokenString.trim()
      let tokenToDecode = cleanToken
      
      if (tokenToDecode.toLowerCase().startsWith('cashu')) {
        if (tokenToDecode.startsWith('cashu:')) {
          tokenToDecode = tokenToDecode.substring(6)
          if (tokenToDecode.startsWith('//')) {
            tokenToDecode = tokenToDecode.substring(2)
          }
        } else {
          tokenToDecode = tokenToDecode.substring(5)
        }
      }

      const decoded = getDecodedToken(tokenToDecode)
      
      let mintUrl, proofs
      if (decoded.token && Array.isArray(decoded.token)) {
        mintUrl = decoded.token[0]?.mint
        proofs = decoded.token[0]?.proofs
      } else if (decoded.mint && decoded.proofs) {
        mintUrl = decoded.mint
        proofs = decoded.proofs
      } else if (Array.isArray(decoded)) {
        mintUrl = decoded[0]?.mint
        proofs = decoded[0]?.proofs
      }

      if (!mintUrl || !proofs || proofs.length === 0) {
        throw new Error('Invalid token from Lightning Address')
      }

      const targetMint = new CashuMint(mintUrl)
      const targetWallet = new CashuWallet(targetMint, { bip39seed: bip39Seed })
      const existingProofs = await getProofs(mintUrl)

      const receivedProofs = await targetWallet.receive(tokenToDecode, {
        counter: 0,
        proofsWeHave: existingProofs
      })

      if (!receivedProofs || receivedProofs.length === 0) {
        throw new Error('Token already claimed')
      }

      const savedProofs = await getProofs(mintUrl)
      const allProofs = [...savedProofs, ...receivedProofs]
      await saveProofs(mintUrl, allProofs.filter(p => p && p.amount))

      calculateAllBalances()

      const amount = receivedProofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      addTransaction('receive', amount, 'Lightning Address payment', mintUrl)
      vibrate([200])

      setSuccess(`⚡ Received ${amount} sats via Lightning!`)
      setLightningToken('')

    } catch (err) {
      console.error('Lightning receive error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReceiveEcash = async () => {
    if (!receiveToken) return

    let detectedMintUrl

    try {
      setLoading(true)
      setError('')

      const cleanToken = receiveToken.trim()

      let tokenToDecode = cleanToken
      if (tokenToDecode.toLowerCase().startsWith('cashu')) {
        if (tokenToDecode.startsWith('cashu:')) {
          tokenToDecode = tokenToDecode.substring(6)
          if (tokenToDecode.startsWith('//')) {
            tokenToDecode = tokenToDecode.substring(2)
          }
        } else {
          tokenToDecode = tokenToDecode.substring(5)
        }
      }

      console.log('Original token:', cleanToken.substring(0, 20) + '...')
      console.log('Token to decode:', tokenToDecode.substring(0, 20) + '...')

      let decoded
      try {
        decoded = getDecodedToken(tokenToDecode)
        console.log('Token decoded:', decoded)
      } catch (decodeErr) {
        console.error('Decode error:', decodeErr)
        throw new Error(`Cannot read token. Make sure you copied the full token.`)
      }

      console.log('FULL decoded:', decoded)
      console.log('decoded keys:', Object.keys(decoded))

      let tokenData
      let proofs

      if (decoded.token && Array.isArray(decoded.token)) {
        console.log('Using OLD token format')
        tokenData = decoded.token[0]
        detectedMintUrl = tokenData?.mint
        proofs = tokenData?.proofs
      } else if (decoded.mint && decoded.proofs) {
        console.log('Using NEW token format (2.7.4)')
        tokenData = decoded
        detectedMintUrl = decoded.mint
        proofs = decoded.proofs
      } else if (Array.isArray(decoded)) {
        console.log('Using DIRECT ARRAY format')
        tokenData = decoded[0]
        detectedMintUrl = tokenData?.mint
        proofs = tokenData?.proofs
      } else {
        console.error('Unknown token structure:', decoded)
        throw new Error('Unknown token structure. Check console for details.')
      }

      if (!detectedMintUrl) {
        throw new Error('Token does not contain mint information')
      }

      if (!proofs || proofs.length === 0) {
        throw new Error('Token does not contain any proofs')
      }

      console.log('Detected mint:', detectedMintUrl)
      console.log('Proofs count:', proofs.length)

      const hasMint = allMints.some(m => m.url === detectedMintUrl)

      if (!hasMint) {
        const mintName = detectedMintUrl.replace('https://', '').replace('http://', '')
        
        // Show unknown mint prompt instead of auto-adding
        setUnknownMintToken(cleanToken)
        setUnknownMintUrl(detectedMintUrl)
        setUnknownMintName(mintName)
        setShowUnknownMintPrompt(true)
        setLoading(false)
        return  // Stop here and let user decide
      }

      const targetMint = new CashuMint(detectedMintUrl)
      const targetWallet = new CashuWallet(targetMint, { bip39seed: bip39Seed })

      const existingProofs = await getProofs(detectedMintUrl)

      let receiveOptions = {
        counter: 0,
        proofsWeHave: existingProofs
      }

      if (isLocked(proofs)) {
        console.log('Token is P2PK locked')

        if (!isLockedToUs(proofs)) {
          throw new Error('This token is locked to a different key. You cannot receive it.')
        }

        const privateKey = getPrivateKeyForP2PKToken(tokenToDecode)

        if (!privateKey) {
          console.error('No matching private key found')
          console.log('Proofs:', proofs)
          throw new Error('Token is locked but no matching private key found. Cannot receive.')
        }

        console.log('Found matching private key!')
        receiveOptions.privkey = privateKey
        setPrivateKeyUsed(privateKey)
      }

      console.log('Receiving with options:', { ...receiveOptions, privkey: receiveOptions.privkey ? '***' : undefined })

      let receivedProofs

      if (tokenToDecode.startsWith('B')) {
        console.log('Detected V4 token (B prefix)')

        const v4Options = {}

        if (receiveOptions.privkey) {
          v4Options.privkey = receiveOptions.privkey
        }

        receivedProofs = await targetWallet.receive(tokenToDecode, v4Options)

      } else {
        console.log('Detected V3 token (A prefix)')

        receivedProofs = await targetWallet.receive(tokenToDecode, receiveOptions)
      }

      if (!receivedProofs || receivedProofs.length === 0) {
        throw new Error('Token already claimed or invalid.')
      }

      const savedProofs = await getProofs(detectedMintUrl)
      const allProofs = [...savedProofs, ...receivedProofs]

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
        ? `Unlocked & received ${receivedAmount} sats!`
        : `Received ${receivedAmount} sats!`

      setSuccess(successMsg)
      setReceiveToken('')

      setTimeout(() => {
        resetReceivePage()
        onClose()
      }, 2000)

    } catch (err) {
      console.error('Receive error:', err)
      console.error('Error message:', err.message)

      if (err.message.includes('already spent') || err.message.includes('already claimed')) {
        setError('Token already claimed or spent')
      } else if (err.message.includes('no outputs provided') || err.message.includes('no keys found')) {
        const hasMint = allMints.some(m => m.url === detectedMintUrl)
        if (!hasMint) {
          setError(`Token is from unknown mint: ${detectedMintUrl}. Add this mint in Settings first.`)
        } else {
          setError(`${err.message}`)
        }
      } else {
        setError(`${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleP2PKQuickAccess = () => {
    if (p2pkKeys.length === 0) {
      if (onNavigate) {
        onNavigate('p2pk-settings')
      }
    } else {
      setShowP2PKKeyPage(true)
    }
  }

  const handleGoToP2PKSettings = () => {
    setShowP2PKKeyPage(false)
    if (onNavigate) {
      onNavigate('p2pk-settings')
    }
  }

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

  if (showUnknownMintPrompt && !mintAdded) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => {
            setShowUnknownMintPrompt(false)
            setUnknownMintToken(null)
            setUnknownMintUrl(null)
            setUnknownMintName(null)
          }}>← Back</button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            Unknown Mint
          </h1>
        </header>

        <div className="card">
          <h3 style={{ color: '#FFA500' }}>Token from Unknown Mint</h3>
          <p style={{ marginBottom: '1em', opacity: 0.8 }}>
            This token is from a mint not in your wallet:
          </p>
          <div style={{ 
            background: 'rgba(255, 165, 0, 0.1)', 
            padding: '1em', 
            borderRadius: '8px',
            marginBottom: '1.5em',
            wordBreak: 'break-all'
          }}>
            <strong>{unknownMintName}</strong>
            <div style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '0.5em' }}>
              {unknownMintUrl}
            </div>
          </div>
          
          <p style={{ fontSize: '0.9em', marginBottom: '1.5em' }}>
            Do you want to add this mint to your wallet?
          </p>

          <button 
            className="primary-btn" 
            onClick={async () => {
              setLoading(true)
              await onAddMint(unknownMintName, unknownMintUrl)
              setMintAdded(true)
              setLoading(false)
            }}
            disabled={loading}
            style={{ marginBottom: '0.5em' }}
          >
            {loading ? 'Adding Mint...' : '✓ Trust & Add Mint'}
          </button>

          <button 
            className="secondary-btn"
            onClick={() => {
              setShowUnknownMintPrompt(false)
              setUnknownMintToken(null)
              setUnknownMintUrl(null)
              setUnknownMintName(null)
              setReceiveToken('')
            }}
          >
            ✗ Cancel
          </button>
        </div>
      </div>
    )
  }

// ADD THIS ENTIRE BLOCK HERE:
  if (showUnknownMintPrompt && mintAdded) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => {
            setShowUnknownMintPrompt(false)
            setUnknownMintToken(null)
            setUnknownMintUrl(null)
            setUnknownMintName(null)
            setMintAdded(false)
          }}>← Back</button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            ✓ Mint Added
          </h1>
        </header>

        <div className="card">
          <h3 style={{ color: '#4CAF50' }}>Mint Successfully Added!</h3>
          <p style={{ marginBottom: '1em', opacity: 0.8 }}>
            <strong>{unknownMintName}</strong> has been added to your wallet.
          </p>
          
          <p style={{ fontSize: '0.9em', marginBottom: '1.5em' }}>
            Ready to receive the token?
          </p>

          <button 
            className="primary-btn" 
            onClick={() => {
              setShowUnknownMintPrompt(false)
              setMintAdded(false)
              setReceiveToken(unknownMintToken)
              setReceiveMethod('ecash')
              setTimeout(() => handleReceiveEcash(), 100)
            }}
            style={{ marginBottom: '0.5em' }}
          >
            ✓ Receive Token
          </button>

          <button 
            className="secondary-btn"
            onClick={() => {
              setShowUnknownMintPrompt(false)
              setUnknownMintToken(null)
              setUnknownMintUrl(null)
              setUnknownMintName(null)
              setMintAdded(false)
              setReceiveToken('')
            }}
          >
            ✗ Cancel
          </button>
        </div>
      </div>
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
                  <span>Token locked to your key - will auto-unlock</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Token locked to different key - cannot receive</span>
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
            {loading ? 'Receiving...' : tokenLockStatus === 'locked-to-us' ? 'Unlock & Receive' : 'Receive Token'}
          </button>

          <button className="back-btn" style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }} onClick={resetReceivePage}>
            ← Change Method
          </button>
        </div>
      ) : (
        <div className="card">
          <ReceiveLightning
            onNavigate={onNavigate}
            onClose={onClose}
            onTokenReceived={(token) => {
              setLightningToken(token)
              handleReceiveLightning(token)
            }}
            setSuccess={setSuccess}
            setError={setError}
          />
          <button className="back-btn" style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }} onClick={resetReceivePage}>
            ← Change Method
          </button>
        </div>
      )}
    </div>
  )
}
