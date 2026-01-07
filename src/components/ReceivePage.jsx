import { useState } from 'react'
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts'
import { vibrate } from '../utils/cashu.js'

export default function ReceivePage({
  wallet,
  bip39Seed,
  allMints,
  totalBalance,
  getProofs,
  saveProofs,
  calculateAllBalances,
  addTransaction,
  error,
  success,
  setError,
  setSuccess,
  loading,
  setLoading,
  onClose,
  onScanRequest
}) {
  const [receiveMethod, setReceiveMethod] = useState(null)
  const [receiveToken, setReceiveToken] = useState('')

  const resetReceivePage = () => {
    setReceiveMethod(null)
    setReceiveToken('')
    setError('')
    setSuccess('')
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

      const proofs = await targetWallet.receive(decoded)

      if (!proofs || proofs.length === 0) {
        throw new Error('Token already claimed or invalid.')
      }

      const existingProofs = getProofs(detectedMintUrl)
      const allProofs = [...existingProofs, ...proofs]

      const validProofs = allProofs.filter(p => p && p.amount && typeof p.amount === 'number')
      saveProofs(detectedMintUrl, validProofs)

      calculateAllBalances()

      const receivedAmount = proofs.reduce((sum, p) => sum + (p.amount || 0), 0)
      addTransaction('receive', receivedAmount, 'Ecash token received', detectedMintUrl)

      vibrate([200])

      setSuccess(`Received ${receivedAmount} sats!`)
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
        </div>
      ) : receiveMethod === 'ecash' ? (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <Wallet size={20} /> Receive Ecash
          </h3>
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
