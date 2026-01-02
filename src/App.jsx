import { useState, useEffect, useRef } from 'react'
import { CashuMint, CashuWallet, getEncodedToken, getDecodedToken } from '@cashu/cashu-ts'
import './App.css'

const DEFAULT_MINTS = [
  { name: 'Minibits', url: 'https://mint.minibits.cash/Bitcoin' },
  { name: 'Kashu', url: 'https://kashu.me' }
]

const WALLET_NAME = 'Satoshi Pay'

// Vibration helper
const vibrate = (pattern = [100]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Splash Screen Component
function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setTimeout(onComplete, 300)
          return 100
        }
        return prev + 5
      })
    }, 50)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1810 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <img
        src="/cashu-bluetooth-wallet/icon-192.png"
        alt="Logo"
        style={{
          width: '120px',
          height: '120px',
          marginBottom: '1em',
          borderRadius: '30px',
          animation: 'pulse 2s ease-in-out infinite'
        }}
      />
      <h1 style={{
        fontSize: '2em',
        fontWeight: 'bold',
        background: 'linear-gradient(90deg, #FFD700, #FF8C00)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '0.5em'
      }}>
        {WALLET_NAME}
      </h1>
      <p style={{
        fontSize: '0.9em',
        opacity: 0.7,
        marginBottom: '2em'
      }}>
        Bitcoin Ecash Wallet
      </p>

      <div style={{
        width: '200px',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #FFD700, #FF8C00)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}

// Install PWA Button Component
function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowInstall(false)
    }

    setDeferredPrompt(null)
  }

  if (!showInstall) return null

  return (
    <button
      onClick={handleInstall}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        background: 'linear-gradient(135deg, #FF8C00, #FFD700)',
        border: 'none',
        borderRadius: '50px',
        padding: '0.8em 1.5em',
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: '0.9em',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(255, 140, 0, 0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5em',
        animation: 'slideIn 0.5s ease-out'
      }}
    >
      <span>📲</span>
      <span>Install App</span>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(200px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </button>
  )
}

// Pending Tokens Component
function PendingTokensView({
  pendingTokens,
  onReclaim,
  onCopy,
  onRemove,
  onClose
}) {
  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h1>📋 Pending Tokens</h1>
      </header>

      {pendingTokens.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.6 }}>
            No pending tokens
          </p>
          <p style={{ fontSize: '0.85em', opacity: 0.5, marginTop: '0.5em' }}>
            Generated tokens that haven't been sent will appear here
          </p>
        </div>
      ) : (
        pendingTokens.map(pending => (
          <div key={pending.id} className="card" style={{ borderColor: '#FF8C00' }}>
            <div style={{ marginBottom: '1em' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#FF8C00' }}>
                {pending.amount} sats
              </div>
              <div style={{ fontSize: '0.8em', opacity: 0.6 }}>
                {new Date(pending.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="token-box">
              <textarea
                readOnly
                value={pending.token}
                rows={3}
                style={{ fontSize: '0.7em', marginBottom: '0.5em' }}
              />
            </div>

            <button
              className="copy-btn"
              onClick={() => onCopy(pending.token)}
              style={{ marginBottom: '0.5em' }}
            >
              📋 Copy Token
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5em' }}>
              <button
                className="secondary-btn"
                onClick={() => onReclaim(pending)}
              >
                ↩️ Reclaim
              </button>
              <button
                className="cancel-btn"
                onClick={() => onRemove(pending.id)}
              >
                🗑️ Delete
              </button>
            </div>

            <p style={{ fontSize: '0.75em', opacity: 0.5, marginTop: '0.5em' }}>
              💡 Reclaim to add back to your balance, or copy to send
            </p>
          </div>
        ))
      )}
    </div>
  )
}

// QR Scanner Component
function QRScanner({ onScan, onClose, mode }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    let isActive = true

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })

        if (!isActive) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', true)
          videoRef.current.play()
          setScanning(true)

          videoRef.current.onloadedmetadata = () => {
            scanQRCode()
          }
        }

      } catch (err) {
        console.error('Camera error:', err)
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else if (err.name === 'NotReadableError') {
          setError('Camera is busy. Close other apps using the camera.')
        } else {
          setError(`Camera error: ${err.message}`)
        }
      }
    }

    const scanQRCode = async () => {
      if (!isActive || !videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      const jsQR = (await import('jsqr')).default

      const scan = () => {
        if (!isActive || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(scan)
          return
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        })

        if (code) {
          console.log('✅ QR Code detected:', code.data)
          isActive = false
          stopCamera()
          onScan(code.data)
          return
        }

        animationFrameRef.current = requestAnimationFrame(scan)
      }

      scan()
    }

    const stopCamera = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }

    startCamera()

    return () => {
      isActive = false
      stopCamera()
    }
  }, [onScan])

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '1em',
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#000',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        {mode === 'send' ? '📸 Scan Lightning invoice or Cashu token' : '📸 Scan Cashu token'}
      </div>

      {error && (
        <div style={{
          margin: '1em',
          padding: '1.5em',
          background: 'rgba(255, 107, 107, 0.95)',
          borderRadius: '12px',
          color: 'white',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5em' }}>⚠️ Error</div>
          {error}
          <div style={{ marginTop: '1em', fontSize: '0.9em' }}>
            Try: Close other camera apps and reload the page
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1em',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '16px',
            display: error ? 'none' : 'block'
          }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {scanning && !error && (
          <div style={{
            position: 'absolute',
            width: '250px',
            height: '250px',
            border: '3px solid #FFD700',
            borderRadius: '16px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              width: '40px',
              height: '40px',
              borderTop: '5px solid #FFD700',
              borderLeft: '5px solid #FFD700'
            }}/>
            <div style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '40px',
              height: '40px',
              borderTop: '5px solid #FFD700',
              borderRight: '5px solid #FFD700'
            }}/>
            <div style={{
              position: 'absolute',
              bottom: '-3px',
              left: '-3px',
              width: '40px',
              height: '40px',
              borderBottom: '5px solid #FFD700',
              borderLeft: '5px solid #FFD700'
            }}/>
            <div style={{
              position: 'absolute',
              bottom: '-3px',
              right: '-3px',
              width: '40px',
              height: '40px',
              borderBottom: '5px solid #FFD700',
              borderRight: '5px solid #FFD700'
            }}/>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
              animation: 'scan 2s linear infinite'
            }}/>
          </div>
        )}
      </div>

      <div style={{
        padding: '1.5em',
        background: 'rgba(0, 0, 0, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            maxWidth: '300px',
            margin: '0 auto',
            display: 'block',
            padding: '1em 2em',
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1em',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          CLOSE
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(250px); }
        }
      `}</style>
    </div>
  )
}

function SendViaLightning({
  wallet,
  mintUrl,
  currentMintBalance,
  getProofsForMint,
  calculateAllBalances,
  addTransaction,
  resetSendPage,
  setError,
  setSuccess,
  setLoading,
  loading,
  lightningInvoice,
  setLightningInvoice,
  decodedInvoice,
  setDecodedInvoice
}) {
  const [sendingPayment, setSendingPayment] = useState(false)

  const handleDecodeInvoice = async () => {
    if (!lightningInvoice.trim()) {
      setError('Please paste a Lightning invoice')
      return
    }

    try {
      setLoading(true)
      setError('')

      const invoice = lightningInvoice.trim().toLowerCase()
      if (!invoice.startsWith('ln')) {
        throw new Error('Invalid Lightning invoice format')
      }

      const meltQuote = await wallet.createMeltQuote(lightningInvoice.trim())

      setDecodedInvoice({
        amount: meltQuote.amount,
        fee: meltQuote.fee_reserve,
        total: meltQuote.amount + meltQuote.fee_reserve,
        quote: meltQuote.quote
      })

      setSuccess('Invoice decoded! Review and confirm.')

    } catch (err) {
      setError(`Failed to decode invoice: ${err.message}`)
      setDecodedInvoice(null)
    } finally {
      setLoading(false)
    }
  }

  const handlePayInvoice = async () => {
    if (!wallet || !decodedInvoice) return

    try {
      setSendingPayment(true)
      setError('')

      const totalAmount = decodedInvoice.total

      if (currentMintBalance < totalAmount) {
        throw new Error(`Insufficient balance. Need ${totalAmount} sats (including ${decodedInvoice.fee} sats fee)`)
      }

      const proofs = getProofsForMint(mintUrl)

      if (!proofs || proofs.length === 0) {
        throw new Error('No proofs available')
      }

      const sendResult = await wallet.send(totalAmount, proofs)
      let proofsToKeep = []
      let proofsToSend = []

      if (sendResult) {
        proofsToKeep = sendResult.keep || sendResult.returnChange || sendResult.change || []
        proofsToSend = sendResult.send || sendResult.sendProofs || []
      }

      if (!proofsToSend || proofsToSend.length === 0) {
        throw new Error('Failed to prepare proofs for payment')
      }

      let meltResponse
      try {
        meltResponse = await wallet.meltTokens(decodedInvoice.quote, proofsToSend)
      } catch (firstError) {
        meltResponse = await wallet.meltTokens(
          {
            quote: decodedInvoice.quote,
            amount: decodedInvoice.amount,
            fee_reserve: decodedInvoice.fee
          },
          proofsToSend
        )
      }

      if (meltResponse && meltResponse.isPaid === false) {
        throw new Error('Invoice payment failed at the mint')
      }

      const changeProofs = meltResponse?.change || []
      const allRemainingProofs = [...proofsToKeep, ...changeProofs]

      const key = `cashu_proofs_${btoa(mintUrl)}`
      localStorage.setItem(key, JSON.stringify(allRemainingProofs))
      calculateAllBalances()

      addTransaction('send', decodedInvoice.amount, 'Paid Lightning invoice', mintUrl)

      // Vibrate on successful send
      vibrate([100, 50, 100])

      setSuccess(`✅ Sent ${decodedInvoice.amount} sats via Lightning!`)

      setTimeout(() => {
        resetSendPage()
        setDecodedInvoice(null)
        setLightningInvoice('')
      }, 2000)

    } catch (err) {
      let errorMessage = 'Unknown error occurred'

      if (err?.message) {
        errorMessage = err.message
      } else if (err?.detail) {
        errorMessage = err.detail
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.error) {
        errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
      }

      setError(`Payment failed: ${errorMessage}`)
    } finally {
      setSendingPayment(false)
    }
  }

  useEffect(() => {
    if (lightningInvoice && !decodedInvoice) {
      handleDecodeInvoice()
    }
  }, [lightningInvoice])

  return (
    <div className="card">
      <h3>⚡ Send via Lightning</h3>

      {!decodedInvoice ? (
        <>
          <p style={{ marginBottom: '1em' }}>
            Paste a Lightning invoice to pay
          </p>
          <div className="token-box">
            <textarea
              placeholder="Paste Lightning invoice here (lnbc...)"
              value={lightningInvoice}
              onChange={(e) => setLightningInvoice(e.target.value)}
              rows={4}
              style={{ fontSize: '0.75em' }}
            />
          </div>
          <button
            className="primary-btn"
            onClick={handleDecodeInvoice}
            disabled={loading || !lightningInvoice.trim()}
          >
            {loading ? 'Decoding...' : 'Decode Invoice'}
          </button>
        </>
      ) : (
        <>
          <div style={{
            background: 'rgba(81, 207, 102, 0.1)',
            padding: '1em',
            borderRadius: '8px',
            marginBottom: '1em'
          }}>
            <div style={{ marginBottom: '0.5em' }}>
              <span style={{ opacity: 0.7 }}>Amount:</span>
              <span style={{ float: 'right', fontWeight: 'bold' }}>{decodedInvoice.amount} sats</span>
            </div>
            <div style={{ marginBottom: '0.5em' }}>
              <span style={{ opacity: 0.7 }}>Network Fee:</span>
              <span style={{ float: 'right' }}>{decodedInvoice.fee} sats</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5em', marginTop: '0.5em' }}>
              <span style={{ opacity: 0.7 }}>Total:</span>
              <span style={{ float: 'right', fontWeight: 'bold', color: '#FF8C00' }}>{decodedInvoice.total} sats</span>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handlePayInvoice}
            disabled={sendingPayment || currentMintBalance < decodedInvoice.total}
            style={{ marginBottom: '0.5em' }}
          >
            {sendingPayment ? 'Sending...' : `Pay ${decodedInvoice.total} sats`}
          </button>

          <button
            className="secondary-btn"
            onClick={() => {
              setDecodedInvoice(null)
              setLightningInvoice('')
            }}
            disabled={sendingPayment}
          >
            Cancel
          </button>
        </>
      )}

      <button
        className="back-btn"
        style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }}
        onClick={resetSendPage}
        disabled={sendingPayment}
      >
        ← Change Method
      </button>
    </div>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [wallet, setWallet] = useState(null)
  const [mintUrl, setMintUrl] = useState(DEFAULT_MINTS[0].url)
  const [customMints, setCustomMints] = useState([])
  const [allMints, setAllMints] = useState(DEFAULT_MINTS)
  const [showMintSettings, setShowMintSettings] = useState(false)
  const [showAddMint, setShowAddMint] = useState(false)
  const [newMintName, setNewMintName] = useState('')
  const [newMintUrl, setNewMintUrl] = useState('')

  const [balances, setBalances] = useState({})
  const [totalBalance, setTotalBalance] = useState(0)

  const [mintAmount, setMintAmount] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [receiveToken, setReceiveToken] = useState('')
  const [generatedToken, setGeneratedToken] = useState('')
  const [generatedQR, setGeneratedQR] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mintInfo, setMintInfo] = useState(null)
  const [lightningInvoice, setLightningInvoice] = useState('')
  const [lightningInvoiceQR, setLightningInvoiceQR] = useState('')
  const [currentQuote, setCurrentQuote] = useState(null)
  const [showSendPage, setShowSendPage] = useState(false)
  const [showReceivePage, setShowReceivePage] = useState(false)
  const [showHistoryPage, setShowHistoryPage] = useState(false)
  const [sendMethod, setSendMethod] = useState(null)
  const [receiveMethod, setReceiveMethod] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [decodedInvoice, setDecodedInvoice] = useState(null)

  const [showScanner, setShowScanner] = useState(false)
  const [scanMode, setScanMode] = useState(null)

  // Pending tokens state
  const [pendingTokens, setPendingTokens] = useState([])
  const [showPendingTokens, setShowPendingTokens] = useState(false)

  // Load pending tokens on mount
  useEffect(() => {
    const loadPendingTokens = () => {
      try {
        const saved = localStorage.getItem('pending_tokens')
        if (saved) {
          setPendingTokens(JSON.parse(saved))
        }
      } catch (err) {
        console.error('Error loading pending tokens:', err)
      }
    }
    loadPendingTokens()
  }, [])

  // Save pending token
  const savePendingToken = (token, amount, mintUrl) => {
    const pending = {
      id: Date.now(),
      token,
      amount,
      mintUrl,
      timestamp: new Date().toISOString()
    }
    const updated = [pending, ...pendingTokens]
    setPendingTokens(updated)
    localStorage.setItem('pending_tokens', JSON.stringify(updated))
  }

  // Remove pending token
  const removePendingToken = (tokenId) => {
    const updated = pendingTokens.filter(t => t.id !== tokenId)
    setPendingTokens(updated)
    localStorage.setItem('pending_tokens', JSON.stringify(updated))
  }

  // Reclaim a pending token
  const reclaimPendingToken = async (pendingToken) => {
    try {
      setLoading(true)
      setError('')

      const decoded = getDecodedToken(pendingToken.token)
      const tokenMintUrl = decoded.token[0]?.mint

      const targetMint = new CashuMint(tokenMintUrl)
      const targetWallet = new CashuWallet(targetMint)

      const proofs = await targetWallet.receive(pendingToken.token)

      if (proofs && proofs.length > 0) {
        const existingProofs = getProofsForMint(tokenMintUrl)
        const allProofs = [...existingProofs, ...proofs]
        saveProofsForMint(tokenMintUrl, allProofs)
        calculateAllBalances()

        removePendingToken(pendingToken.id)

        vibrate([200])

        setSuccess(`✅ Reclaimed ${pendingToken.amount} sats!`)
        setTimeout(() => setSuccess(''), 2000)
      }
    } catch (err) {
      setError(`Could not reclaim: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 NEW: Check if pending tokens have been spent
  const checkPendingTokensStatus = async () => {
    if (pendingTokens.length === 0) return

    for (const pending of pendingTokens) {
      try {
        const decoded = getDecodedToken(pending.token)
        const tokenMintUrl = decoded.token[0]?.mint

        if (!tokenMintUrl) continue

        const targetMint = new CashuMint(tokenMintUrl)
        const targetWallet = new CashuWallet(targetMint)

        // Try to check if token is still valid
        try {
          await targetWallet.receive(pending.token)
          // If we get here, token is still valid (not spent)
        } catch (err) {
          // If error contains "already spent" or "already claimed", remove from pending
          if (err.message?.includes('already spent') ||
              err.message?.includes('already claimed') ||
              err.message?.includes('Token already spent')) {
            console.log(`✓ Token ${pending.id} was spent, removing from pending`)
            removePendingToken(pending.id)
          }
        }
      } catch (err) {
        console.error('Error checking pending token:', err)
      }
    }
  }

  const savePendingQuote = (quote, amount, mintUrl) => {
    const pending = {
      quote: quote.quote,
      amount: amount,
      mintUrl: mintUrl,
      timestamp: Date.now(),
      request: quote.request
    }
    localStorage.setItem('pending_mint_quote', JSON.stringify(pending))
  }

  const getPendingQuote = () => {
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

  const clearPendingQuote = () => {
    localStorage.removeItem('pending_mint_quote')
  }

  const checkPendingQuotes = async () => {
    const pending = getPendingQuote()

    if (!pending) return

    const threeMinutes = 3 * 60 * 1000
    if (Date.now() - pending.timestamp > threeMinutes) {
      console.log('Quote expired, clearing...')
      clearPendingQuote()
      setLightningInvoice('')
      setLightningInvoiceQR('')
      setCurrentQuote(null)
      setMintAmount('')
      return
    }

    try {
      const mint = new CashuMint(pending.mintUrl)
      const tempWallet = new CashuWallet(mint)

      const { proofs } = await tempWallet.mintTokens(pending.amount, pending.quote)

      if (proofs && proofs.length > 0) {
        const existingProofs = getProofsForMint(pending.mintUrl)
        const allProofs = [...existingProofs, ...proofs]
        const key = `cashu_proofs_${btoa(pending.mintUrl)}`
        localStorage.setItem(key, JSON.stringify(allProofs))

        calculateAllBalances()
        addTransaction('receive', pending.amount, 'Minted via Lightning', pending.mintUrl)
        clearPendingQuote()

        // Vibrate on successful receive
        vibrate([200])

        setSuccess(`🎉 Received ${pending.amount} sats!`)
        setLightningInvoice('')
        setLightningInvoiceQR('')
        setCurrentQuote(null)
        setMintAmount('')

        setTimeout(() => {
          setSuccess('')
        }, 2000)

        return true
      }
    } catch (err) {
      if (err.message?.includes('not paid') || err.message?.includes('pending')) {
        console.log('Invoice not paid yet, will check again...')
        return false
      }

      console.error('Error checking pending quote:', err)
      return false
    }
  }

  useEffect(() => {
    loadCustomMints()
    initWallet()
    loadTransactions()
    calculateAllBalances()
  }, [])

  useEffect(() => {
    if (mintUrl) {
      initWallet()
    }
  }, [mintUrl])

  // 🔥 UPDATED: Enhanced useEffect with pending token checker
  useEffect(() => {
    const checkOnMount = async () => {
      const hasPending = getPendingQuote()
      if (hasPending) {
        console.log('📋 Found pending quote on mount, checking...')
        await checkPendingQuotes()
      }

      // Also check pending tokens on mount
      if (pendingTokens.length > 0) {
        console.log('📋 Checking pending tokens status...')
        await checkPendingTokensStatus()
      }
    }

    checkOnMount()

    const interval = setInterval(async () => {
      const hasPending = getPendingQuote()
      if (hasPending) {
        await checkPendingQuotes()
      }

      // Check pending tokens every 10 seconds
      if (pendingTokens.length > 0) {
        await checkPendingTokensStatus()
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [wallet, allMints, pendingTokens])

  const loadCustomMints = () => {
    try {
      const saved = localStorage.getItem('custom_mints')
      if (saved) {
        const custom = JSON.parse(saved)
        setCustomMints(custom)
        setAllMints([...DEFAULT_MINTS, ...custom])
      }
    } catch (err) {
      console.error('Error loading custom mints:', err)
    }
  }

  const saveCustomMints = (mints) => {
    localStorage.setItem('custom_mints', JSON.stringify(mints))
    setCustomMints(mints)
    setAllMints([...DEFAULT_MINTS, ...mints])
  }

  const handleAddMint = () => {
    if (!newMintName || !newMintUrl) {
      setError('Please enter both name and URL')
      return
    }

    const newMint = { name: newMintName, url: newMintUrl }
    const updated = [...customMints, newMint]
    saveCustomMints(updated)

    setNewMintName('')
    setNewMintUrl('')
    setShowAddMint(false)
    setSuccess('Mint added!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const handleRemoveMint = (mintUrl) => {
    if (confirm(`Remove this mint?\n\nThis will NOT delete your tokens, but you won't see them until you add the mint back.`)) {
      const updated = customMints.filter(m => m.url !== mintUrl)
      saveCustomMints(updated)
      setSuccess('Mint removed!')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const initWallet = async () => {
    try {
      setLoading(true)
      setError('')

      const mint = new CashuMint(mintUrl)
      const newWallet = new CashuWallet(mint)

      // Try to get mint info, but don't fail if offline
      try {
        const info = await mint.getInfo()
        setMintInfo(info)
      } catch (infoError) {
        console.log('Could not fetch mint info (offline?):', infoError)
        setMintInfo({ name: 'Mint', nuts: {} })
      }

      setWallet(newWallet)
      await validateProofs(newWallet, mintUrl)
      calculateAllBalances()

    } catch (err) {
      console.error('Wallet init error:', err)
      setMintInfo({ name: 'Mint', nuts: {} })
    } finally {
      setLoading(false)
    }
  }

  const validateProofs = async (walletInstance, currentMintUrl) => {
    try {
      const proofs = getProofsForMint(currentMintUrl)
      if (proofs.length === 0) return

      const validProofs = proofs.filter(p => {
        return p && p.amount && typeof p.amount === 'number' && p.secret && p.C
      })

      if (validProofs.length < proofs.length) {
        console.log('Removed', proofs.length - validProofs.length, 'invalid proofs')
        saveProofsForMint(currentMintUrl, validProofs)
      }
    } catch (err) {
      console.error('Proof validation error:', err)
    }
  }

  const calculateAllBalances = () => {
    const mintBalances = {}
    let total = 0

    allMints.forEach(mint => {
      const proofs = getProofsForMint(mint.url)
      const balance = proofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      mintBalances[mint.url] = balance
      total += balance
    })

    setBalances(mintBalances)
    setTotalBalance(total)
  }

  const saveProofsForMint = (mintUrl, proofs) => {
    try {
      const validProofs = proofs.filter(p => p && p.amount && typeof p.amount === 'number')
      const key = `cashu_proofs_${btoa(mintUrl)}`
      localStorage.setItem(key, JSON.stringify(validProofs))
    } catch (err) {
      console.error('Error saving proofs:', err)
    }
  }

  const getProofsForMint = (mintUrl) => {
    try {
      const key = `cashu_proofs_${btoa(mintUrl)}`
      const saved = localStorage.getItem(key)
      if (!saved || saved === 'undefined' || saved === 'null') {
        return []
      }
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed.filter(p => p && p.amount) : []
    } catch (err) {
      console.error('Error loading proofs:', err)
      return []
    }
  }

  const loadTransactions = () => {
    try {
      const saved = localStorage.getItem('cashu_transactions')
      if (saved && saved !== 'undefined' && saved !== 'null') {
        setTransactions(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Error loading transactions:', err)
    }
  }

  const addTransaction = (type, amount, note, mint) => {
    const tx = {
      id: Date.now(),
      type,
      amount,
      note,
      mint: mint || mintUrl,
      timestamp: new Date().toISOString()
    }
    const updated = [tx, ...transactions]
    setTransactions(updated)
    localStorage.setItem('cashu_transactions', JSON.stringify(updated))
  }

  const generateQR = async (data) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`
    return qrUrl
  }

  const handleScan = async (scannedData) => {
    setShowScanner(false)

    try {
      const data = scannedData.trim()
      const dataLower = data.toLowerCase()

      if (dataLower.startsWith('cashu')) {
        setReceiveToken(data)
        setShowReceivePage(true)
        setReceiveMethod('ecash')
        setTimeout(() => {
          handleReceiveEcash()
        }, 100)
        return
      }

      if (dataLower.startsWith('lnbc') ||
          dataLower.startsWith('lntb') ||
          dataLower.startsWith('lnbcrt') ||
          dataLower.startsWith('ln')) {
        setLightningInvoice(data)
        setShowSendPage(true)
        setSendMethod('lightning')
        return
      }

      if (dataLower.includes('lightning:')) {
        const invoice = data.split('lightning:')[1]
        setLightningInvoice(invoice)
        setShowSendPage(true)
        setSendMethod('lightning')
        return
      }

      if (dataLower.includes('cashu:')) {
        const token = data.split('cashu:')[1]
        setReceiveToken(token)
        setShowReceivePage(true)
        setReceiveMethod('ecash')
        setTimeout(() => {
          handleReceiveEcash()
        }, 100)
        return
      }

      setError('Unknown QR code format. Please scan a Lightning invoice or Cashu token.')
      setTimeout(() => setError(''), 4000)

    } catch (err) {
      console.error('Scan processing error:', err)
      setError(`Error processing scan: ${err.message}`)
      setTimeout(() => setError(''), 4000)
    }
  }

  const handleMint = async () => {
    if (!wallet || !mintAmount) return

    try {
      setLoading(true)
      setError('')
      const amount = parseInt(mintAmount)

      const quote = await wallet.createMintQuote(amount)
      setLightningInvoice(quote.request)
      setCurrentQuote(quote)

      savePendingQuote(quote, amount, mintUrl)

      const qr = await generateQR(quote.request)
      setLightningInvoiceQR(qr)

      setSuccess('✅ Invoice created! Checking for payment...')
      setTimeout(() => setSuccess(''), 2000)

    } catch (err) {
      setError(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelMint = () => {
    clearPendingQuote()

    setLightningInvoice('')
    setLightningInvoiceQR('')
    setCurrentQuote(null)
    setMintAmount('')
    setError('')
    setSuccess('')
  }

  const handleSendEcash = async () => {
    if (!wallet || !sendAmount) return

    try {
      setLoading(true)
      setError('')
      const amount = parseInt(sendAmount)
      const proofs = getProofsForMint(mintUrl)
      const currentBalance = balances[mintUrl] || 0

      if (proofs.length === 0) {
        throw new Error('No tokens available. Mint some first!')
      }

      if (currentBalance < amount) {
        throw new Error(`Insufficient balance. You have ${currentBalance} sats.`)
      }

      const result = await wallet.send(amount, proofs)

      if (!result) {
        throw new Error('wallet.send returned nothing')
      }

      const { keep, send, returnChange } = result

      const proofsToKeep = keep || returnChange || []
      const proofsToSend = send || []

      if (!proofsToSend || proofsToSend.length === 0) {
        throw new Error('Failed to create send proofs')
      }

      const key = `cashu_proofs_${btoa(mintUrl)}`
      localStorage.setItem(key, JSON.stringify(proofsToKeep))

      calculateAllBalances()

      const token = getEncodedToken({
        token: [{ mint: mintUrl, proofs: proofsToSend }]
      })

      const qr = await generateQR(token)
      setGeneratedToken(token)
      setGeneratedQR(qr)

      // Save as pending token
      savePendingToken(token, amount, mintUrl)

      addTransaction('send', amount, 'Ecash token generated (pending)', mintUrl)

      // Vibrate on successful generation
      vibrate([100, 50, 100])

      setSuccess('Token generated!')
      setSendAmount('')

    } catch (err) {
      setError(`Send failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
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
      const targetWallet = new CashuWallet(targetMint)

      const proofs = await targetWallet.receive(cleanToken)

      if (!proofs || proofs.length === 0) {
        throw new Error('Token already claimed or invalid.')
      }

      const existingProofs = getProofsForMint(detectedMintUrl)
      const allProofs = [...existingProofs, ...proofs]

      const validProofs = allProofs.filter(p => p && p.amount && typeof p.amount === 'number')
      const key = `cashu_proofs_${btoa(detectedMintUrl)}`
      localStorage.setItem(key, JSON.stringify(validProofs))

      calculateAllBalances()

      const receivedAmount = proofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      addTransaction('receive', receivedAmount, 'Ecash token received', detectedMintUrl)

      // Vibrate on successful receive
      vibrate([200])

      // 🔥 NEW: Remove this token from pending since it's been successfully claimed
      const matchingPending = pendingTokens.find(p => p.token === cleanToken)
      if (matchingPending) {
        console.log('✓ Removing claimed token from pending')
        removePendingToken(matchingPending.id)
      }

      setSuccess(`✅ Received ${receivedAmount} sats!`)
      setReceiveToken('')

      setTimeout(() => {
        setShowReceivePage(false)
        resetReceivePage()
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

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(`✓ ${label} copied!`)
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      textArea.setSelectionRange(0, 99999)

      try {
        document.execCommand('copy')
        setSuccess(`✓ ${label} copied!`)
        setTimeout(() => setSuccess(''), 2000)
      } catch (copyErr) {
        setError('Tap and hold the token to copy')
        setTimeout(() => setError(''), 3000)
      }

      document.body.removeChild(textArea)
    }
  }

  const handleResetWallet = (specificMint = null) => {
    const targetMint = specificMint || mintUrl
    const targetBalance = balances[targetMint] || 0
    const mintName = allMints.find(m => m.url === targetMint)?.name || 'this mint'

    if (confirm(`⚠️ Reset ${mintName}?\n\nThis will clear ${targetBalance} sats from this mint.\n\nThis cannot be undone!`)) {
      const key = `cashu_proofs_${btoa(targetMint)}`
      localStorage.removeItem(key)
      calculateAllBalances()
      setSuccess(`${mintName} reset!`)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const resetSendPage = () => {
    setGeneratedToken('')
    setGeneratedQR('')
    setSendAmount('')
    setSendMethod(null)
    setError('')
    setSuccess('')
  }

  const resetReceivePage = () => {
    setReceiveMethod(null)
    setReceiveToken('')
    setError('')
    setSuccess('')
  }

  const currentMintBalance = balances[mintUrl] || 0

  // Show splash screen on first load
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  if (showScanner) {
    return (
      <QRScanner
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
        mode={scanMode}
      />
    )
  }

  // Pending tokens page
  if (showPendingTokens) {
    return (
      <PendingTokensView
        pendingTokens={pendingTokens}
        onReclaim={reclaimPendingToken}
        onCopy={(token) => copyToClipboard(token, 'Token')}
        onRemove={removePendingToken}
        onClose={() => setShowPendingTokens(false)}
      />
    )
  }

  // Settings page
  if (showMintSettings) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => setShowMintSettings(false)}>← Back</button>
          <h1>⚙️ Settings</h1>
        </header>

        <div className="card">
          <h3>Select Mint</h3>
          <p style={{ fontSize: '0.85em', marginBottom: '1em', opacity: 0.7 }}>
            Current: {allMints.find(m => m.url === mintUrl)?.name || 'Unknown'}
          </p>

          {allMints.map(mint => (
            <div key={mint.url} className="mint-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{mint.name}</div>
                <div style={{ fontSize: '0.8em', opacity: 0.6, wordBreak: 'break-all' }}>{mint.url}</div>
                <div style={{ fontSize: '0.9em', marginTop: '0.3em', color: '#FF8C00' }}>
                  {balances[mint.url] || 0} sats
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5em', alignItems: 'center' }}>
                {mintUrl === mint.url ? (
                  <span style={{ color: '#51cf66', fontSize: '0.9em' }}>✓ Active</span>
                ) : (
                  <button
                    className="secondary-btn"
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85em', width: 'auto' }}
                    onClick={() => setMintUrl(mint.url)}
                  >
                    Switch
                  </button>
                )}
                {!DEFAULT_MINTS.find(m => m.url === mint.url) && (
                  <button
                    className="cancel-btn"
                    style={{ padding: '0.4em 0.8em', fontSize: '0.85em', width: 'auto' }}
                    onClick={() => handleRemoveMint(mint.url)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          <button className="primary-btn" onClick={() => setShowAddMint(true)} style={{ marginTop: '1em' }}>
            + Add Mint
          </button>
        </div>

        {showAddMint && (
          <div className="card">
            <h3>Add New Mint</h3>
            <input
              type="text"
              placeholder="Mint name (e.g., My Mint)"
              value={newMintName}
              onChange={(e) => setNewMintName(e.target.value)}
              style={{ marginBottom: '0.5em' }}
            />
            <input
              type="text"
              placeholder="Mint URL (https://...)"
              value={newMintUrl}
              onChange={(e) => setNewMintUrl(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5em', marginTop: '0.5em' }}>
              <button className="secondary-btn" onClick={() => setShowAddMint(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleAddMint}>Add</button>
            </div>
          </div>
        )}

        <div className="card" style={{ borderColor: '#ff6b6b' }}>
          <h3 style={{ color: '#ff6b6b' }}>⚠️ Danger Zone</h3>
          <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
            Reset the current mint if you have corrupted tokens.
          </p>
          <button
            className="cancel-btn"
            onClick={() => handleResetWallet()}
            style={{ width: '100%' }}
          >
            Reset Current Mint ({currentMintBalance} sats)
          </button>
        </div>
      </div>
    )
  }

  // History page
  if (showHistoryPage) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => {
            setShowHistoryPage(false)
            calculateAllBalances()
          }}>← Back</button>
          <h1>📜 History</h1>
        </header>

        <div className="card balance-card-small">
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#FF8C00' }}>{totalBalance} sats</div>
          <div style={{ fontSize: '0.85em', opacity: 0.6 }}>Total Balance</div>
        </div>

        {transactions.length === 0 ? (
          <div className="card">
            <p style={{ textAlign: 'center', opacity: 0.6 }}>No transactions yet</p>
          </div>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} className="card transaction-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                    <span style={{ fontSize: '1.5em' }}>
                      {tx.type === 'send' ? '📤' : '📥'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: tx.type === 'send' ? '#ff6b6b' : '#51cf66' }}>
                        {tx.type === 'send' ? '-' : '+'}{tx.amount} sats
                      </div>
                      <div style={{ fontSize: '0.8em', opacity: 0.6 }}>{tx.note}</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75em', opacity: 0.6, textAlign: 'right' }}>
                  {new Date(tx.timestamp).toLocaleDateString()}<br/>
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    )
  }

  // Send page
  if (showSendPage) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => {
            setShowSendPage(false)
            resetSendPage()
            calculateAllBalances()
          }}>← Back</button>
          <h1>📤 Send</h1>
        </header>

        <div className="card balance-card-small">
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#FF8C00' }}>{currentMintBalance} sats</div>
          <div style={{ fontSize: '0.85em', opacity: 0.6 }}>Available Balance</div>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {!sendMethod ? (
          <div className="card">
            <h3>Choose Send Method</h3>
            <p style={{ marginBottom: '1em', opacity: 0.8 }}>How do you want to send?</p>

            <button
              className="primary-btn"
              style={{ marginBottom: '0.5em', background: '#4CAF50' }}
              onClick={() => {
                setShowScanner(true)
                setScanMode('send')
              }}
            >
              <span style={{ fontSize: '1.2em', marginRight: '0.5em' }}>⌘</span> Scan to Pay
            </button>

            <button className="primary-btn" style={{ marginBottom: '0.5em' }} onClick={() => setSendMethod('ecash')}>
              💰 Send Ecash Token
            </button>
            <button className="primary-btn" onClick={() => setSendMethod('lightning')}>
              ⚡ Send via Lightning
            </button>
          </div>
        ) : sendMethod === 'lightning' ? (
          <SendViaLightning
            wallet={wallet}
            mintUrl={mintUrl}
            currentMintBalance={currentMintBalance}
            getProofsForMint={getProofsForMint}
            calculateAllBalances={calculateAllBalances}
            addTransaction={addTransaction}
            resetSendPage={() => {
              resetSendPage()
            }}
            setError={setError}
            setSuccess={setSuccess}
            setLoading={setLoading}
            loading={loading}
            lightningInvoice={lightningInvoice}
            setLightningInvoice={setLightningInvoice}
            decodedInvoice={decodedInvoice}
            setDecodedInvoice={setDecodedInvoice}
          />
        ) : (
          <div className="card">
            <h3>💰 Send Ecash</h3>
            <p style={{ marginBottom: '1em' }}>
              Generate a token to send
            </p>
            <input
              type="number"
              placeholder="Amount in sats"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />
            <button className="primary-btn" onClick={handleSendEcash} disabled={loading || !sendAmount || currentMintBalance === 0}>
              {loading ? 'Generating...' : 'Generate Token'}
            </button>

            {generatedToken && (
              <div style={{ marginTop: '1em' }}>
                {generatedQR && (
                  <div style={{ textAlign: 'center', marginBottom: '1em' }}>
                    <img src={generatedQR} alt="QR Code" style={{ maxWidth: '250px', borderRadius: '8px' }} />
                  </div>
                )}
                <div className="token-box">
                  <textarea
                    readOnly
                    value={generatedToken}
                    rows={4}
                    style={{ fontSize: '0.7em', marginBottom: '0.5em' }}
                  />
                </div>
                <button className="copy-btn" onClick={() => copyToClipboard(generatedToken, 'Token')}>
                  📋 Copy Token
                </button>
              </div>
            )}

            <button className="back-btn" style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }} onClick={() => {
              resetSendPage()
            }}>
              ← Change Method
            </button>
          </div>
        )}
      </div>
    )
  }

  // Receive page
  if (showReceivePage) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => {
            setShowReceivePage(false)
            resetReceivePage()
            calculateAllBalances()
          }}>← Back</button>
          <h1>📥 Receive</h1>
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
              onClick={() => {
                setShowScanner(true)
                setScanMode('receive')
              }}
            >
              <span style={{ fontSize: '1.2em', marginRight: '0.5em' }}>⌘</span> Scan Token
            </button>

            <button className="primary-btn" style={{ marginBottom: '0.5em' }} onClick={() => setReceiveMethod('ecash')}>
              💰 Paste Ecash Token
            </button>
            <button className="secondary-btn" onClick={() => setReceiveMethod('lightning')}>
              ⚡ Receive via Lightning
            </button>
          </div>
        ) : receiveMethod === 'ecash' ? (
          <div className="card">
            <h3>💰 Receive Ecash</h3>
            <p style={{ marginBottom: '1em' }}>
              Paste a Cashu token
            </p>
            <div className="token-box">
              <textarea
                placeholder="Paste token here..."
                value={receiveToken}
                onChange={(e) => setReceiveToken(e.target.value)}
                rows={6}
              />
            </div>
            <button className="primary-btn" onClick={handleReceiveEcash} disabled={loading || !receiveToken}>
              {loading ? 'Receiving...' : 'Receive Token'}
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

  // Main page
  return (
    <div className="app">
      <InstallButton />

      <header className="main-header">
        <div className="wallet-name">⚡ {WALLET_NAME}</div>
        <button className="settings-icon" onClick={() => setShowMintSettings(true)}>
          ⚙️
        </button>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="balance-display">
        <div className="balance-amount">{totalBalance}</div>
        <div className="balance-unit">sats</div>
        {mintInfo && (
          <div className="mint-name">{mintInfo.name || 'Connected'}</div>
        )}
      </div>

      <div className="card">
        <h3>💰 Get Tokens</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em' }}>
          Pay a Lightning invoice to mint tokens
        </p>

        {!lightningInvoice ? (
          <>
            <input
              type="number"
              placeholder="Amount in sats"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
            />
            <button
              className="primary-btn"
              onClick={handleMint}
              disabled={loading || !mintAmount}
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </>
        ) : (
          <div>
            <p style={{ fontSize: '0.9em', marginBottom: '0.5em', color: '#51cf66' }}>
              ⚡ Lightning Invoice:
            </p>
            {lightningInvoiceQR && (
              <div style={{ textAlign: 'center', marginBottom: '1em' }}>
                <img src={lightningInvoiceQR} alt="Invoice QR" style={{ maxWidth: '250px', borderRadius: '8px' }} />
              </div>
            )}
            <div className="token-box">
              <textarea
                readOnly
                value={lightningInvoice}
                rows={3}
                style={{ fontSize: '0.7em', marginBottom: '0.5em' }}
              />
            </div>

            <div style={{
              background: 'rgba(81, 207, 102, 0.1)',
              padding: '0.8em',
              borderRadius: '8px',
              marginBottom: '0.5em',
              fontSize: '0.85em'
            }}>
              💡 After paying, your funds will appear automatically within a few seconds
            </div>

            <button className="copy-btn" onClick={() => copyToClipboard(lightningInvoice, 'Invoice')} style={{ marginBottom: '0.5em' }}>
              📋 Copy Invoice
            </button>
            <button
              className="cancel-btn"
              onClick={handleCancelMint}
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {pendingTokens.length > 0 && (
        <button
          className="history-btn"
          onClick={() => setShowPendingTokens(true)}
          style={{
            background: 'rgba(255, 140, 0, 0.1)',
            borderColor: '#FF8C00'
          }}
        >
          📋 Pending Tokens ({pendingTokens.length})
        </button>
      )}

      <button className="history-btn" onClick={() => setShowHistoryPage(true)}>
        📜 Transaction History
      </button>

      <div className="action-buttons-compact">
        <button className="receive-btn-compact" onClick={() => setShowReceivePage(true)}>
          <span className="btn-icon-compact">↓</span>
          <span className="btn-text-compact">Receive</span>
        </button>
        <button className="send-btn-compact" onClick={() => setShowSendPage(true)}>
          <span className="btn-icon-compact">↑</span>
          <span className="btn-text-compact">Send</span>
        </button>
      </div>

      <footer style={{ marginTop: '2em', opacity: 0.5, textAlign: 'center', fontSize: '0.85em' }}>
        <p>Lead Life • Like Satoshi</p>
      </footer>
    </div>
  )
}

export default App
