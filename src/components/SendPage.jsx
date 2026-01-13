import { useState, useEffect } from 'react'
import { Send, Wallet, Zap, Mail, CheckCircle, Repeat } from 'lucide-react'
import SendViaEcash from './SendViaEcash.jsx'
import SendViaLightning from './SendViaLightning.jsx'
import SendViaNostr from './SendViaNostr.jsx'

export default function SendPage({
  wallet,
  mintUrl,
  currentMintBalance,
  getProofs,
  saveProofs,
  calculateAllBalances,
  addTransaction,
  addPendingToken,
  scannedData,
  error,
  success,
  setError,
  setSuccess,
  loading,
  setLoading,
  onClose,
  onScanRequest,
  allMints,
  balances,
  onMintSwitch
}) {
  const [sendMethod, setSendMethod] = useState(null)
  const [lightningInvoice, setLightningInvoice] = useState('')
  const [decodedInvoice, setDecodedInvoice] = useState(null)
  const [showMintSelector, setShowMintSelector] = useState(false)

  useEffect(() => {
    if (scannedData) {
      const dataLower = scannedData.toLowerCase()
      
      if (dataLower.startsWith('lnbc') || 
          dataLower.startsWith('lntb') ||
          dataLower.startsWith('lnbcrt') ||
          dataLower.startsWith('ln') ||
          (scannedData.includes('@') && scannedData.includes('.'))) {
        
        setSendMethod('lightning')
        setLightningInvoice(scannedData)
      }
    }
  }, [scannedData])

  const resetSendPage = () => {
    setSendMethod(null)
    setLightningInvoice('')
    setDecodedInvoice(null)
    setError('')
    setSuccess('')
  }

  const handleMintSwitch = (newMintUrl) => {
    onMintSwitch(newMintUrl)
    setShowMintSelector(false)
    setSuccess('Mint switched!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const currentMint = allMints?.find(m => m.url === mintUrl)

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={() => {
          resetSendPage()
          onClose()
        }}>← Back</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <Send size={24} /> Send
        </h1>
      </header>

      {/* Mint Selector */}
      {allMints && allMints.length > 0 && (
        <div className="card" style={{
          padding: '0.8em',
          background: 'rgba(255, 140, 0, 0.05)',
          borderColor: 'rgba(255, 140, 0, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: showMintSelector ? '0.8em' : 0
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75em', opacity: 0.6, marginBottom: '0.2em' }}>
                Sending from:
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>
                {currentMint?.name || 'Unknown Mint'}
              </div>
            </div>
            {allMints.length > 1 && (
              <button
                onClick={() => setShowMintSelector(!showMintSelector)}
                style={{
                  background: 'rgba(255, 140, 0, 0.2)',
                  color: '#FF8C00',
                  border: '1px solid rgba(255, 140, 0, 0.3)',
                  padding: '0.5em 1em',
                  borderRadius: '6px',
                  fontSize: '0.85em',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                <Repeat size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> {showMintSelector ? 'Close' : 'Switch'}
              </button>
            )}
          </div>

          {showMintSelector && allMints.length > 1 && (
            <div style={{
              borderTop: '1px solid rgba(255, 140, 0, 0.2)',
              paddingTop: '0.8em'
            }}>
              <div style={{ fontSize: '0.85em', marginBottom: '0.5em', opacity: 0.7 }}>
                Select mint to send from:
              </div>
              {allMints.map(mint => (
                <div
                  key={mint.url}
                  onClick={() => handleMintSwitch(mint.url)}
                  style={{
                    padding: '0.6em',
                    marginBottom: '0.4em',
                    background: mint.url === mintUrl
                      ? 'rgba(81, 207, 102, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: mint.url === mintUrl
                      ? '1px solid rgba(81, 207, 102, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.85em' }}>
                        {mint.name}
                        {mint.url === mintUrl && (
                          <span style={{ color: '#51cf66', marginLeft: '0.5em', display: 'inline-flex', alignItems: 'center' }}>
                            <CheckCircle size={14} />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7em', opacity: 0.5, marginTop: '0.2em' }}>
                        {balances?.[mint.url] || 0} sats
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Balance Card */}
      <div className="card balance-card-small">
        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#FF8C00' }}>{currentMintBalance} sats</div>
        <div style={{ fontSize: '0.85em', opacity: 0.6 }}>Available Balance</div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Method Selection or Component */}
      {!sendMethod ? (
        <div className="card">
          <h3>Choose Send Method</h3>
          <p style={{ marginBottom: '1em', opacity: 0.8 }}>How do you want to send?</p>

          <button
            className="primary-btn"
            style={{ marginBottom: '0.5em', background: '#4CAF50' }}
            onClick={() => onScanRequest('send')}
          >
            <span style={{ fontSize: '1.2em', marginRight: '0.5em' }}>⌘</span> Scan to Pay
          </button>

          <button className="primary-btn" style={{ marginBottom: '0.5em' }} onClick={() => setSendMethod('ecash')}>
            <Wallet size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Send Ecash Token
          </button>
          
          <button className="primary-btn" style={{ marginBottom: '0.5em' }} onClick={() => setSendMethod('lightning')}>
            <Zap size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Send via Lightning
          </button>
          
          <button 
            className="primary-btn" 
            onClick={() => setSendMethod('nostr')}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              borderColor: '#8B5CF6'
            }}
          >
            <Mail size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Send via Nostr
          </button>
        </div>
      ) : sendMethod === 'ecash' ? (
        <SendViaEcash
          wallet={wallet}
          mintUrl={mintUrl}
          currentMintBalance={currentMintBalance}
          getProofs={getProofs}
          saveProofs={saveProofs}
          calculateAllBalances={calculateAllBalances}
          addTransaction={addTransaction}
          addPendingToken={addPendingToken}
          resetSendPage={resetSendPage}
          setError={setError}
          setSuccess={setSuccess}
          setLoading={setLoading}
          loading={loading}
        />
      ) : sendMethod === 'lightning' ? (
        <SendViaLightning
          wallet={wallet}
          mintUrl={mintUrl}
          currentMintBalance={currentMintBalance}
          getProofs={getProofs}
          saveProofs={saveProofs}
          calculateAllBalances={calculateAllBalances}
          addTransaction={addTransaction}
          resetSendPage={resetSendPage}
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
        <SendViaNostr
          wallet={wallet}
          mintUrl={mintUrl}
          currentMintBalance={currentMintBalance}
          getProofs={getProofs}
          saveProofs={saveProofs}
          calculateAllBalances={calculateAllBalances}
          addTransaction={addTransaction}
          addPendingToken={addPendingToken}
          resetSendPage={resetSendPage}
          setError={setError}
          setSuccess={setSuccess}
          setLoading={setLoading}
          loading={loading}
        />
      )}
    </div>
  )
}

