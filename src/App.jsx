import { useState, useEffect } from 'react'
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts'
import { Settings, Zap, FileText, Copy, ArrowDown, ArrowUp, Lightbulb, CheckCircle } from 'lucide-react'
import './App.css'

// Hooks
import { useWallet } from './hooks/useWallet.js'
import { usePendingTokens } from './hooks/usePendingTokens.js'

// Utils
import { generateQR, vibrate, WALLET_NAME } from './utils/cashu.js'
import {
  savePendingQuote,
  getPendingQuote,
  clearPendingQuote
} from './utils/storage.js'

// Components
import SplashScreen from './components/SplashScreen.jsx'
import SeedPhraseBackup from './components/SeedPhraseBackup.jsx'
import RestoreWallet from './components/RestoreWallet.jsx'
import InstallButton from './components/InstallButton.jsx'
import QRScanner from './components/QRScanner.jsx'
import PendingTokens from './components/PendingTokens.jsx'
import HistoryPage from './components/HistoryPage.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import SendPage from './components/SendPage.jsx'
import ReceivePage from './components/ReceivePage.jsx'

function App() {
  // Splash screen
  const [showSplash, setShowSplash] = useState(true)

  // Wallet hook
  const walletState = useWallet()
  const {
    wallet,
    mintUrl,
    setMintUrl,
    allMints,
    mintInfo,
    balances,
    totalBalance,
    currentMintBalance,
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
  } = walletState

  // Pending tokens hook
  const {
    pendingTokens,
    addPendingToken,
    removePendingToken,
    reclaimPendingToken
  } = usePendingTokens(wallet, bip39Seed, updateTransactionStatus)

  // Page routing
  const [showSendPage, setShowSendPage] = useState(false)
  const [showReceivePage, setShowReceivePage] = useState(false)
  const [showHistoryPage, setShowHistoryPage] = useState(false)
  const [showMintSettings, setShowMintSettings] = useState(false)
  const [showPendingTokens, setShowPendingTokens] = useState(false)
  const [showRestoreWallet, setShowRestoreWallet] = useState(false)

  // QR Scanner
  const [showScanner, setShowScanner] = useState(false)
  const [scanMode, setScanMode] = useState(null)
  const [scannedData, setScannedData] = useState(null) // NEW: Store scanned data

  // Mint/Receive state
  const [mintAmount, setMintAmount] = useState('')
  const [lightningInvoice, setLightningInvoice] = useState('')
  const [lightningInvoiceQR, setLightningInvoiceQR] = useState('')
  const [currentQuote, setCurrentQuote] = useState(null)

  // Global success handler for pending tokens hook
  useEffect(() => {
    window.showSuccess = (msg) => {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 3000)
    }
    return () => {
      delete window.showSuccess
    }
  }, [setSuccess])

  // Check pending quotes on mount and interval
  useEffect(() => {
    const checkPendingQuotes = async () => {
      const pending = getPendingQuote()

      if (!pending) return

      const threeMinutes = 3 * 60 * 1000
      if (Date.now() - pending.timestamp > threeMinutes) {
        clearPendingQuote()
        setLightningInvoice('')
        setLightningInvoiceQR('')
        setCurrentQuote(null)
        setMintAmount('')
        return
      }

      try {
        const mint = new CashuMint(pending.mintUrl)
        const tempWallet = new CashuWallet(mint, { bip39seed: bip39Seed })

        const { proofs } = await tempWallet.mintTokens(pending.amount, pending.quote)

        if (proofs && proofs.length > 0) {
          const existingProofs = getProofs(pending.mintUrl)
          const allProofs = [...existingProofs, ...proofs]
          saveProofs(pending.mintUrl, allProofs)

          calculateAllBalances()
          addTransaction('receive', pending.amount, 'Minted via Lightning', pending.mintUrl)
          clearPendingQuote()

          vibrate([200])

          setSuccess(`Received ${pending.amount} sats!`)
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
          return false
        }
        console.error('Error checking pending quote:', err)
        return false
      }
    }

    const checkOnMount = async () => {
      const hasPending = getPendingQuote()
      if (hasPending) {
        await checkPendingQuotes()
      }
    }

    checkOnMount()

    const interval = setInterval(async () => {
      const hasPending = getPendingQuote()
      if (hasPending) {
        await checkPendingQuotes()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [wallet, allMints, bip39Seed, getProofs, saveProofs, calculateAllBalances, addTransaction])

  // Handle QR scan - UPDATED
  const handleScan = async (data) => {
    setShowScanner(false)

    try {
      // Add safety check
      if (!data || typeof data !== 'string') {
        setError('Invalid scan data')
        setTimeout(() => setError(''), 4000)
        return
      }

      const cleanData = data.trim()
      const dataLower = cleanData.toLowerCase()

      // Store the scanned data
      setScannedData(cleanData)

      // Check for Cashu token
      if (dataLower.startsWith('cashu')) {
        setShowReceivePage(true)
        return
      }

      // Check for Lightning invoice
      if (dataLower.startsWith('lnbc') ||
          dataLower.startsWith('lntb') ||
          dataLower.startsWith('lnbcrt') ||
          dataLower.startsWith('ln')) {
        setShowSendPage(true)
        return
      }

      // Check for Lightning with prefix
      if (dataLower.includes('lightning:')) {
        setShowSendPage(true)
        return
      }

      // Check for Cashu with prefix
      if (dataLower.includes('cashu:')) {
        setShowReceivePage(true)
        return
      }

      // Check for Lightning Address
      if (cleanData.includes('@') && cleanData.includes('.') && !cleanData.includes(' ')) {
        setShowSendPage(true)
        return
      }

      setTimeout(() => setError(''), 4000)

    } catch (err) {
      console.error('Scan processing error:', err)
      setError(`Error processing scan: ${err.message}`)
      setTimeout(() => setError(''), 4000)
    }
  }

  // Handle mint/receive Lightning
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

      setSuccess('Invoice created! Checking for payment...')
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

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(`${label} copied!`)
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError('Failed to copy')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleResetMint = () => {
    const targetBalance = currentMintBalance
    const mintName = allMints.find(m => m.url === mintUrl)?.name || 'this mint'

    if (confirm(`⚠️ Reset ${mintName}?\n\nThis will clear ${targetBalance} sats from this mint.\n\nThis cannot be undone!`)) {
      resetMint()
      setSuccess(`${mintName} reset!`)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // Render splash screen
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  // Render seed backup screen
  if (showSeedBackup) {
    return (
      <SeedPhraseBackup
        seedPhrase={seedPhrase}
        onConfirm={handleSeedBackupConfirm}
        onCancel={() => !isNewWallet && setShowSeedBackup(false)}
        isNewWallet={isNewWallet}
      />
    )
  }

  // Render restore wallet screen
  if (showRestoreWallet) {
    return (
      <RestoreWallet
        onRestore={handleRestoreWallet}
        onCancel={() => setShowRestoreWallet(false)}
      />
    )
  }

  // Render QR scanner
  if (showScanner) {
    return (
      <QRScanner
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
        mode={scanMode}
      />
    )
  }

  // Render pending tokens page
  if (showPendingTokens) {
    return (
      <PendingTokens
        pendingTokens={pendingTokens}
        onReclaim={(pending) => reclaimPendingToken(
          pending,
          getProofs,
          saveProofs,
          calculateAllBalances,
          setError,
          setSuccess,
          setLoading
        )}
        onCopy={(token) => copyToClipboard(token, 'Token')}
        onRemove={removePendingToken}
        onClose={() => setShowPendingTokens(false)}
      />
    )
  }

  // Render history page
  if (showHistoryPage) {
    return (
      <HistoryPage
        transactions={transactions}
        totalBalance={totalBalance}
        onClose={() => {
          setShowHistoryPage(false)
          calculateAllBalances()
        }}
      />
    )
  }

  // Render settings page
  if (showMintSettings) {
    return (
      <SettingsPage
        allMints={allMints}
        mintUrl={mintUrl}
        balances={balances}
        currentMintBalance={currentMintBalance}
        onMintSwitch={setMintUrl}
        onAddMint={addCustomMint}
        onRemoveMint={removeCustomMint}
        onResetMint={handleResetMint}
        onShowSeedBackup={() => {
          const currentSeed = localStorage.getItem('wallet_seed')
          if (currentSeed && currentSeed !== seedPhrase) {
            setSeedPhrase(currentSeed)
          }
          setShowSeedBackup(true)
        }}
        onShowRestoreWallet={() => setShowRestoreWallet(true)}
        onClose={() => setShowMintSettings(false)}
        seedPhrase={seedPhrase}
        setSeedPhrase={setSeedPhrase}
      />
    )
  }

  // Render send page - UPDATED
  if (showSendPage) {
    return (
      <SendPage
        wallet={wallet}
        mintUrl={mintUrl}
        currentMintBalance={currentMintBalance}
        getProofs={getProofs}
        saveProofs={saveProofs}
        calculateAllBalances={calculateAllBalances}
        addTransaction={addTransaction}
        addPendingToken={addPendingToken}
        allMints={allMints}
        balances={balances}
        onMintSwitch={setMintUrl}
        scannedData={scannedData}
        error={error}
        success={success}
        setError={setError}
        setSuccess={setSuccess}
        loading={loading}
        setLoading={setLoading}
        onClose={() => {
          setShowSendPage(false)
          setScannedData(null) // Clear scanned data
          calculateAllBalances()
        }}
        onScanRequest={(mode) => {
          setScanMode(mode)
          setShowScanner(true)
        }}
      />
    )
  }

  // Render receive page - UPDATED
  if (showReceivePage) {
    return (
      <ReceivePage
        wallet={wallet}
        mintUrl={mintUrl}
        allMints={allMints}
        bip39Seed={bip39Seed}
        getProofs={getProofs}
        saveProofs={saveProofs}
        calculateAllBalances={calculateAllBalances}
        addTransaction={addTransaction}
        mintAmount={mintAmount}
        setMintAmount={setMintAmount}
        lightningInvoice={lightningInvoice}
        lightningInvoiceQR={lightningInvoiceQR}
        currentQuote={currentQuote}
        handleMint={handleMint}
        handleCancelMint={handleCancelMint}
        copyToClipboard={copyToClipboard}
        scannedData={scannedData}
        error={error}
        success={success}
        setError={setError}
        setSuccess={setSuccess}
        loading={loading}
        setLoading={setLoading}
        onClose={() => {
          setShowReceivePage(false)
          setScannedData(null) // Clear scanned data
          calculateAllBalances()
        }}
        onScanRequest={(mode) => {
          setScanMode(mode)
          setShowScanner(true)
        }}
      />
    )
  }

  // Main home screen
  return (
    <div className="app">
      <InstallButton />

      <header className="main-header">
        <div className="wallet-name">⚡ {WALLET_NAME}</div>
        <button className="settings-icon" onClick={() => setShowMintSettings(true)}>
          <Settings size={24} />
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
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <Zap size={20} /> Get Tokens
        </h3>
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
                <img src={lightningInvoiceQR} alt="Invoice QR" style={{ maxWidth: '280px', width: '100%', borderRadius: '8px' }} />
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
              <Lightbulb size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> After paying, your funds will appear automatically within a few seconds
            </div>

            <button className="copy-btn" onClick={() => copyToClipboard(lightningInvoice, 'Invoice')} style={{ marginBottom: '0.5em' }}>
              <Copy size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Copy Invoice
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
          <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Pending Tokens ({pendingTokens.length})
        </button>
      )}

      <button className="history-btn" onClick={() => setShowHistoryPage(true)}>
        <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Transaction History
      </button>

      <div className="action-buttons-compact">
        <button className="receive-btn-compact" onClick={() => setShowReceivePage(true)}>
          <ArrowDown size={24} className="btn-icon-compact" />
          <span className="btn-text-compact">Receive</span>
        </button>
        <button className="send-btn-compact" onClick={() => setShowSendPage(true)}>
          <ArrowUp size={24} className="btn-icon-compact" />
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
