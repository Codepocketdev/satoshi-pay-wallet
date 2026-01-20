import { useState, useEffect } from 'react'
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts'
import { Settings, Zap, FileText, Copy, ArrowDown, ArrowUp, Lightbulb, CheckCircle, RefreshCw } from 'lucide-react'
import './App.css'

import { useWallet } from './hooks/useWallet.js'
import { usePendingTokens } from './hooks/usePendingTokens.js'
import { useMintQuoteProcessor } from './hooks/useMintQuoteProcessor.js'
import { migrateToDexie } from './utils/migrateToDexie.js'

import { generateQR, vibrate, WALLET_NAME } from './utils/cashu.js'
import {
  saveMintQuote,
  deleteMintQuote
} from './utils/mintQuoteRepository.js'

import {
  getBTCPrice,
  satsToFiat,
  formatFiat,
  getSelectedCurrency,
  getDisplayMode,
  setDisplayMode
} from './utils/price.js'

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
  const [showSplash, setShowSplash] = useState(true)

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
    masterKey,
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

  const {
    pendingTokens,
    addPendingToken,
    removePendingToken,
    reclaimPendingToken
  } = usePendingTokens(wallet, bip39Seed, updateTransactionStatus)

  // 🔥 NEW: Mint quote processor hook - handles all pending mint quotes
  useMintQuoteProcessor({
    bip39Seed,
    getProofs,
    saveProofs,
    calculateAllBalances,
    addTransaction,
    setSuccess,
    setError,
    onQuotePaid: () => {
      // Clear invoice UI when paid
      setLightningInvoice('')
      setLightningInvoiceQR('')
      setCurrentQuote(null)
      setMintAmount('')
    }
  })

  const [showSendPage, setShowSendPage] = useState(false)
  const [showReceivePage, setShowReceivePage] = useState(false)
  const [showHistoryPage, setShowHistoryPage] = useState(false)
  const [showMintSettings, setShowMintSettings] = useState(false)
  const [showPendingTokens, setShowPendingTokens] = useState(false)
  const [showRestoreWallet, setShowRestoreWallet] = useState(false)

  const [showScanner, setShowScanner] = useState(false)
  const [scanMode, setScanMode] = useState(null)
  const [scannedData, setScannedData] = useState(null)

  const [mintAmount, setMintAmount] = useState('')
  const [lightningInvoice, setLightningInvoice] = useState('')
  const [lightningInvoiceQR, setLightningInvoiceQR] = useState('')
  const [currentQuote, setCurrentQuote] = useState(null)

  const [btcPrice, setBtcPrice] = useState(null)
  const [displayMode, setDisplayModeState] = useState(getDisplayMode())
  const [selectedCurrency, setSelectedCurrency] = useState(getSelectedCurrency())

  // Run migration on app start
  useEffect(() => {
    const runMigration = async () => {
      try {
        const result = await migrateToDexie()
        if (result.success && !result.alreadyMigrated) {
          console.log('✅ Migration completed:', result.counts)
        }
      } catch (err) {
        console.error('❌ Migration error:', err)
      }
    }

    runMigration()
  }, [])

  useEffect(() => {
    const fetchPrice = async () => {
      const currency = getSelectedCurrency().toLowerCase()
      const price = await getBTCPrice(currency)
      if (price) {
        setBtcPrice(price)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedCurrency])

  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedCurrency(getSelectedCurrency())
      setDisplayModeState(getDisplayMode())
    }

    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(handleStorageChange, 1000)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const toggleDisplayMode = () => {
    const newMode = displayMode === 'sats' ? 'fiat' : 'sats'
    setDisplayMode(newMode)
    setDisplayModeState(newMode)
  }

  const formatBalance = () => {
    if (displayMode === 'sats') {
      return {
        primary: totalBalance,
        primaryUnit: 'sats',
        secondary: btcPrice ? formatFiat(satsToFiat(totalBalance, btcPrice), selectedCurrency) : null
      }
    } else {
      const fiatAmount = btcPrice ? satsToFiat(totalBalance, btcPrice).toFixed(2) : '0.00'
      const currencySymbol = selectedCurrency.toUpperCase()

      return {
        primary: fiatAmount,
        primaryUnit: currencySymbol,
        secondary: totalBalance + ' sats'
      }
    }
  }

  const handleScan = async (data) => {
    setShowScanner(false)
    try {
      if (!data || typeof data !== 'string') {
        setError('Invalid scan data')
        setTimeout(() => setError(''), 4000)
        return
      }

      const cleanData = data.trim()
      const dataLower = cleanData.toLowerCase()
      setScannedData(cleanData)

      if (dataLower.startsWith('cashu')) {
        setShowReceivePage(true)
        return
      }

      if (dataLower.startsWith('lnbc') || dataLower.startsWith('lntb') || dataLower.startsWith('lnbcrt') || dataLower.startsWith('ln')) {
        setShowSendPage(true)
        return
      }

      if (dataLower.includes('lightning:')) {
        setShowSendPage(true)
        return
      }

      if (dataLower.includes('cashu:')) {
        setShowReceivePage(true)
        return
      }

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

  // 🔥 UPDATED: handleMint with proper quote persistence
  const handleMint = async () => {
    if (!wallet || !mintAmount) return

    try {
      setLoading(true)
      setError('')
      const amount = parseInt(mintAmount)

      const mintQuote = await wallet.mint.createMintQuote({
        amount: amount,
        unit: 'sat'
      })

      console.log('✅ Mint quote created:', mintQuote)

      // 🔥 Save to database immediately
      await saveMintQuote({
        quote: mintQuote.quote,
        request: mintQuote.request,
        amount: amount,
        mintUrl: mintUrl,
        state: 'UNPAID'
      })

      setLightningInvoice(mintQuote.request)
      setCurrentQuote(mintQuote)
      
      const qr = await generateQR(mintQuote.request)
      setLightningInvoiceQR(qr)
      
      setSuccess('Invoice created! Checking for payment...')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('❌ Mint error:', err)
      setError(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 UPDATED: handleCancelMint with proper cleanup
  const handleCancelMint = async () => {
    if (currentQuote) {
      // Delete from database when user cancels
      await deleteMintQuote(currentQuote.quote)
    }
    
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
    if (confirm(`Reset ${mintName}?\n\nThis will clear ${targetBalance} sats from this mint.\n\nThis cannot be undone!`)) {
      resetMint()
      setSuccess(`${mintName} reset!`)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />
  if (showSeedBackup) return <SeedPhraseBackup seedPhrase={seedPhrase} onConfirm={handleSeedBackupConfirm} onCancel={() => !isNewWallet && setShowSeedBackup(false)} isNewWallet={isNewWallet} />
  if (showRestoreWallet) return <RestoreWallet onRestore={handleRestoreWallet} onCancel={() => setShowRestoreWallet(false)} />
  if (showScanner) return <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} mode={scanMode} />
  if (showPendingTokens) return <PendingTokens pendingTokens={pendingTokens} onReclaim={(pending) => reclaimPendingToken(pending, getProofs, saveProofs, calculateAllBalances, setError, setSuccess, setLoading)} onCopy={(token) => copyToClipboard(token, 'Token')} onRemove={removePendingToken} onClose={() => setShowPendingTokens(false)} />
  if (showHistoryPage) return <HistoryPage transactions={transactions} totalBalance={totalBalance} onClose={() => { setShowHistoryPage(false); calculateAllBalances() }} />

  if (showMintSettings) {
    return (
      <SettingsPage
        allMints={allMints}
        mintUrl={mintUrl}
        balances={balances}
        currentMintBalance={currentMintBalance}
        setMintUrl={setMintUrl}
        addCustomMint={addCustomMint}
        removeCustomMint={removeCustomMint}
        resetMint={handleResetMint}
        onShowSeedBackup={() => {
          const currentSeed = localStorage.getItem('wallet_seed')
          if (currentSeed && currentSeed !== seedPhrase) setSeedPhrase(currentSeed)
          setShowSeedBackup(true)
        }}
        onShowRestoreWallet={() => setShowRestoreWallet(true)}
        onBack={() => setShowMintSettings(false)}
        seedPhrase={seedPhrase}
        setSeedPhrase={setSeedPhrase}
        setSuccess={setSuccess}
        wallet={wallet}
        masterKey={masterKey}
        getProofs={getProofs}
        saveProofs={saveProofs}
        addTransaction={addTransaction}
        setError={setError}
        bip39Seed={bip39Seed}
      />
    )
  }

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
        onClose={() => { setShowSendPage(false); setScannedData(null); calculateAllBalances() }}
        onScanRequest={(mode) => { setScanMode(mode); setShowScanner(true) }}
      />
    )
  }

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
        onAddMint={addCustomMint}
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
        onClose={() => { setShowReceivePage(false); setScannedData(null); calculateAllBalances() }}
        onScanRequest={(mode) => { setScanMode(mode); setShowScanner(true) }}
        totalBalance={totalBalance}
        onNavigate={(page) => {
          setShowReceivePage(false)
          if (page === 'p2pk-settings') {
            setShowMintSettings(true)
          }
        }}
      />
    )
  }

  const balance = formatBalance()

  return (
    <div className="app">
      <InstallButton />
      <header className="main-header">
        <div className="wallet-name">{WALLET_NAME}</div>
        <button className="settings-icon" onClick={() => setShowMintSettings(true)}>
          <Settings size={24} />
        </button>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="balance-display">
        <div className="balance-amount">{balance.primary}</div>
        {balance.primaryUnit && <div className="balance-unit">{balance.primaryUnit}</div>}
        {mintInfo && <div className="mint-name">{mintInfo.name || 'Connected'}</div>}

        {balance.secondary && (
          <div
            onClick={toggleDisplayMode}
            style={{
              textAlign: 'center',
              fontSize: '0.75em',
              opacity: 0.6,
              cursor: 'pointer',
              marginTop: '0.3em',
              padding: '0.3em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3em',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            {balance.secondary}
            <RefreshCw size={11} />
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '1em', marginBottom: '1em' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5em', marginBottom: '0.5em' }}>
          <Zap size={18} /> Get Tokens
        </h3>
        <p style={{ fontSize: '0.85em', marginBottom: '0.8em', opacity: 0.8 }}>Pay a Lightning invoice to mint tokens</p>

        {!lightningInvoice ? (
          <>
            <input type="number" placeholder="Amount in sats" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} />
            <button className="primary-btn" onClick={handleMint} disabled={loading || !mintAmount}>{loading ? 'Creating...' : 'Create Invoice'}</button>
          </>
        ) : (
          <div>
            <p style={{ fontSize: '0.9em', marginBottom: '0.5em', color: '#51cf66' }}>Lightning Invoice:</p>
            {lightningInvoiceQR && (
              <div style={{ textAlign: 'center', marginBottom: '1em' }}>
                <img src={lightningInvoiceQR} alt="Invoice QR" style={{ maxWidth: '280px', width: '100%', borderRadius: '8px' }} />
              </div>
            )}
            <div className="token-box">
              <textarea readOnly value={lightningInvoice} rows={3} style={{ fontSize: '0.7em', marginBottom: '0.5em' }} />
            </div>
            <div style={{ background: 'rgba(81, 207, 102, 0.1)', padding: '0.8em', borderRadius: '8px', marginBottom: '0.5em', fontSize: '0.85em' }}>
              <Lightbulb size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> After paying, your funds will appear automatically within a few seconds
            </div>
            <button className="copy-btn" onClick={() => copyToClipboard(lightningInvoice, 'Invoice')} style={{ marginBottom: '0.5em' }}>
              <Copy size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Copy Invoice
            </button>
            <button className="cancel-btn" onClick={handleCancelMint} style={{ width: '100%' }}>Cancel</button>
          </div>
        )}
      </div>

      {(pendingTokens.length > 0 || parseInt(localStorage.getItem('pending_tokens_count') || '0') > 0) && (
        <button className="history-btn" onClick={() => setShowPendingTokens(true)} style={{ background: 'rgba(255, 140, 0, 0.1)', borderColor: '#FF8C00', marginBottom: '0.5em' }}>
          <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Pending Tokens ({pendingTokens.length || parseInt(localStorage.getItem('pending_tokens_count') || '0')})
        </button>
      )}

      <button className="history-btn" onClick={() => setShowHistoryPage(true)} style={{ marginBottom: '1em' }}>
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
        <p>Lead Life ● Like Satoshi</p>
      </footer>
    </div>
  )
}

export default App
