import { useState, useEffect } from 'react'
import { CashuMint, CashuWallet, getEncodedToken, getDecodedToken } from '@cashu/cashu-ts'
import './App.css'

const DEFAULT_MINTS = [
  { name: 'Minibits', url: 'https://mint.minibits.cash/Bitcoin' },
  { name: 'Legend LNbits', url: 'https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQGoC' },
  { name: 'Testnut', url: 'https://testnut.cashu.space' }
]

const WALLET_NAME = 'Satoshi Pay'

function App() {
  const [wallet, setWallet] = useState(null)
  const [mintUrl, setMintUrl] = useState(DEFAULT_MINTS[0].url)
  const [customMints, setCustomMints] = useState([])
  const [allMints, setAllMints] = useState(DEFAULT_MINTS)
  const [showMintSettings, setShowMintSettings] = useState(false)
  const [showAddMint, setShowAddMint] = useState(false)
  const [newMintName, setNewMintName] = useState('')
  const [newMintUrl, setNewMintUrl] = useState('')
  
  // Multi-mint balances
  const [balances, setBalances] = useState({}) // { mintUrl: balance }
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
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [showSendPage, setShowSendPage] = useState(false)
  const [showReceivePage, setShowReceivePage] = useState(false)
  const [showHistoryPage, setShowHistoryPage] = useState(false)
  const [showScanPage, setShowScanPage] = useState(false)
  const [sendMethod, setSendMethod] = useState(null)
  const [receiveMethod, setReceiveMethod] = useState(null)
  const [transactions, setTransactions] = useState([])

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
      
      const info = await mint.getInfo()
      setMintInfo(info)
      
      setWallet(newWallet)
      await validateProofs(newWallet, mintUrl)
      calculateAllBalances()
      
    } catch (err) {
      setError(`Failed to connect: ${err.message}`)
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
      calculateAllBalances()
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

  const handleMint = async () => {
    if (!wallet || !mintAmount) return
    
    try {
      setLoading(true)
      setError('')
      const amount = parseInt(mintAmount)
      
      const quote = await wallet.createMintQuote(amount)
      setLightningInvoice(quote.request)
      setCurrentQuote(quote)
      
      const qr = await generateQR(quote.request)
      setLightningInvoiceQR(qr)
      
      setSuccess('Invoice created! Pay and click Check Payment.')
      
    } catch (err) {
      setError(`Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckPayment = async () => {
    if (!wallet || !currentQuote) return
    
    try {
      setCheckingPayment(true)
      setError('')
      
      const amount = parseInt(mintAmount)
      const { proofs } = await wallet.mintTokens(amount, currentQuote.quote)
      
      const existingProofs = getProofsForMint(mintUrl)
      const allProofs = [...existingProofs, ...proofs]
      saveProofsForMint(mintUrl, allProofs)
      
      addTransaction('receive', amount, 'Minted via Lightning', mintUrl)
      
      setSuccess(`✅ Received ${amount} sats!`)
      setLightningInvoice('')
      setLightningInvoiceQR('')
      setCurrentQuote(null)
      setMintAmount('')
      
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err) {
      if (err.message.includes('not paid') || err.message.includes('pending') || err.message.includes('quote not paid')) {
        setError('Invoice not paid yet. Pay it first, then try again.')
      } else {
        setError(`Error: ${err.message}`)
      }
    } finally {
      setCheckingPayment(false)
    }
  }

  const handleCancelMint = () => {
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
        throw new Error(`Insufficient balance. You have ${currentBalance} sats on this mint.`)
      }
      
      const { keep, send } = await wallet.send(amount, proofs)
      
      // Save ONLY the kept proofs (remove the sent ones)
      saveProofsForMint(mintUrl, keep)
      
      const token = getEncodedToken({
        token: [{ mint: mintUrl, proofs: send }]
      })
      
      const qr = await generateQR(token)
      
      setGeneratedToken(token)
      setGeneratedQR(qr)
      addTransaction('send', amount, 'Ecash token generated', mintUrl)
      setSuccess('Token generated!')
      setSendAmount('')
      
    } catch (err) {
      if (err.message.includes('keyset') && err.message.includes('unknown')) {
        setError(`Your tokens are invalid or expired. Go to Settings → Reset Wallet for this mint.`)
      } else {
        setError(`Send failed: ${err.message}`)
      }
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
      
      // Check if we have this mint
      const hasMint = allMints.some(m => m.url === detectedMintUrl)
      
      if (!hasMint) {
        throw new Error(`Token is from unknown mint: ${detectedMintUrl}\n\nAdd this mint in Settings first.`)
      }
      
      // Create wallet for the detected mint
      const targetMint = new CashuMint(detectedMintUrl)
      const targetWallet = new CashuWallet(targetMint)
      
      const proofs = await targetWallet.receive(cleanToken)
      
      if (!proofs || proofs.length === 0) {
        throw new Error('Token already claimed or invalid.')
      }
      
      const existingProofs = getProofsForMint(detectedMintUrl)
      const allProofs = [...existingProofs, ...proofs]
      saveProofsForMint(detectedMintUrl, allProofs)
      
      const receivedAmount = proofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      addTransaction('receive', receivedAmount, 'Ecash token received', detectedMintUrl)
      
      setSuccess(`✅ Received ${receivedAmount} sats!`)
      setReceiveToken('')
      
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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    setSuccess(`${label} copied!`)
    setTimeout(() => setSuccess(''), 2000)
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
    setSendMethod(null)
    setGeneratedToken('')
    setGeneratedQR('')
    setSendAmount('')
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

  // [Continue with Send, Receive, History pages... - keeping them mostly the same but using currentMintBalance]
  
  // I'll continue in next message due to length...
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
            <button className="primary-btn" style={{ marginBottom: '0.5em' }} onClick={() => setSendMethod('ecash')}>
              💰 Send Ecash Token
            </button>
            <button className="secondary-btn" onClick={() => setSendMethod('lightning')}>
              ⚡ Send via Lightning (Coming Soon)
            </button>
          </div>
        ) : sendMethod === 'ecash' ? (
          <div className="card">
            <h3>💰 Send Ecash</h3>
            <p style={{ marginBottom: '1em' }}>
              Generate an offline token
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
            
            <button className="back-btn" style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }} onClick={resetSendPage}>
              ← Change Method
            </button>
          </div>
        ) : (
          <div className="card">
            <h3>⚡ Send Lightning</h3>
            <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.7 }}>
              Coming soon!
            </p>
            <button className="back-btn" style={{ position: 'relative', left: 0, transform: 'none' }} onClick={resetSendPage}>
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
            <button className="primary-btn" style={{ marginBottom: '0.5em' }} onClick={() => setReceiveMethod('ecash')}>
              💰 Receive Ecash Token
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
            <button className="primary-btn" onClick={handleMint} disabled={loading || !mintAmount}>
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
            <div style={{ display: 'grid', gap: '0.5em', gridTemplateColumns: '1fr 1fr' }}>
              <button className="copy-btn" onClick={() => copyToClipboard(lightningInvoice, 'Invoice')}>
                📋 Copy
              </button>
              <button 
                className="primary-btn" 
                onClick={handleCheckPayment} 
                disabled={checkingPayment}
              >
                {checkingPayment ? 'Checking...' : '✓ Check Payment'}
              </button>
            </div>
            <button 
              className="cancel-btn" 
              onClick={handleCancelMint}
              style={{ marginTop: '0.5em', width: '100%' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

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
        <p>Phase 1 ✓ • Next: Bluetooth 📲</p>
      </footer>
    </div>
  )
}

export default App
