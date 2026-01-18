import { useState, useEffect } from 'react'
import { getEncodedToken } from '@cashu/cashu-ts'
import { Send, CheckCircle, Zap } from 'lucide-react'
import { vibrate } from '../utils/cashu.js'
import {
  sendNostrToken,
  isValidNpub,
  formatPubkey,
  getNostrProfile
} from '../utils/nostr.js'

export default function SendViaNostr({
  wallet,
  mintUrl,
  currentMintBalance,
  getProofs,
  saveProofs,
  calculateAllBalances,
  addTransaction,
  addPendingToken,
  resetSendPage,
  setError,
  setSuccess,
  setLoading,
  loading
}) {
  const [sendAmount, setSendAmount] = useState('')
  const [recipientNpub, setRecipientNpub] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [profileInfo, setProfileInfo] = useState(null)

  const nsec = localStorage.getItem('nostr_nsec')
  const isConnected = !!nsec

  useEffect(() => {
    if (recipientNpub && isValidNpub(recipientNpub)) {
      getNostrProfile(recipientNpub)
        .then(profile => setProfileInfo(profile))
        .catch(() => setProfileInfo(null))
    } else {
      setProfileInfo(null)
    }
  }, [recipientNpub])

  const handleGenerateAndSend = async () => {
  if (!sendAmount || parseInt(sendAmount) <= 0) {
    setError('Please enter an amount')
    return
  }

  if (!recipientNpub.trim()) {
    setError('Please enter recipient npub')
    return
  }

  if (!isValidNpub(recipientNpub)) {
    setError('Invalid npub format')
    return
  }

  if (!isConnected) {
    setError('Please connect your Nostr identity in Settings first')
    return
  }

  try {
    setSending(true)
    setError('')

    const amount = parseInt(sendAmount)
    const proofs = await getProofs(mintUrl)

    if (proofs.length === 0) {
      throw new Error('No tokens available. Mint some first!')
    }

    if (currentMintBalance < amount) {
      throw new Error(`Insufficient balance. You have ${currentMintBalance} sats.`)
    }

    console.log('Sending', amount, 'sats')

    // EXACT same pattern as SendViaEcash - no keysetId, just empty options
    const sendOptions = {}
    
    console.log('Calling wallet.send with options:', sendOptions)
    const result = await wallet.send(amount, proofs, sendOptions)
    console.log('wallet.send result:', result)

    if (!result) {
      throw new Error('wallet.send returned nothing')
    }

    // Same result handling as SendViaEcash
    let proofsToSend
    let proofsToKeep

    if (result.send && result.keep !== undefined) {
      proofsToSend = result.send
      proofsToKeep = result.keep
    } else if (result.returnChange && result.send) {
      proofsToSend = result.send
      proofsToKeep = result.returnChange
    } else if (Array.isArray(result)) {
      proofsToSend = result
      proofsToKeep = []
    } else {
      console.error('Unknown result structure:', result)
      throw new Error('Unexpected wallet.send response format')
    }

    if (!proofsToSend || proofsToSend.length === 0) {
      throw new Error('Failed to create send proofs')
    }

    console.log('Proofs to send:', proofsToSend.length)
    console.log('Proofs to keep:', proofsToKeep.length)

    await saveProofs(mintUrl, proofsToKeep)
    calculateAllBalances()

    // Generate token - same as SendViaEcash
    const token = getEncodedToken({
      mint: mintUrl,
      proofs: proofsToSend
    })

    console.log('Generated token:', token.substring(0, 50) + '...')

    // NOW send via Nostr
    console.log('Sending token via Nostr...')
    await sendNostrToken(nsec, recipientNpub, token, message)
    
    const txId = addTransaction('send', amount, `Sent to ${formatPubkey(recipientNpub)} via Nostr`, mintUrl, 'pending')
    addPendingToken(token, amount, mintUrl, proofsToSend, txId)

    setSuccess('✅ Token sent via Nostr DM!')
    vibrate([100, 50, 100])

    setTimeout(() => {
      resetSendPage()
      setSendAmount('')
      setRecipientNpub('')
      setMessage('')
    }, 2000)

  } catch (err) {
    console.error('Send error:', err)
    setError(`Failed: ${err.message}`)
  } finally {
    setSending(false)
  }
}

  if (!isConnected) {
    return (
      <div className="card">
        <h3>Send via Nostr</h3>
        <div style={{
          padding: '1.5em',
          background: 'rgba(255, 140, 0, 0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2em', marginBottom: '0.5em' }}><Zap size={48} /></div>
          <p>Connect your Nostr identity first!</p>
          <p style={{ fontSize: '0.85em', opacity: 0.7, marginTop: '0.5em' }}>
            Go to Settings → Nostr Integration
          </p>
        </div>
        <button
          className="back-btn"
          style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }}
          onClick={resetSendPage}
        >
          ← Change Method
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>Send via Nostr DM</h3>
      <p style={{ marginBottom: '1em', fontSize: '0.9em' }}>
        Send ecash tokens via encrypted Nostr DM
      </p>

      <div style={{ marginBottom: '1em' }}>
        <label style={{ display: 'block', marginBottom: '0.5em', fontSize: '0.9em' }}>
          Amount (sats):
        </label>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5em',
          marginBottom: '0.5em'
        }}>
          {[10, 50, 100, 500].map(amount => (
            <button
              key={amount}
              onClick={() => setSendAmount(amount.toString())}
              style={{
                padding: '0.6em 0.4em',
                background: sendAmount === amount.toString() 
                  ? 'rgba(139, 92, 246, 0.3)' 
                  : 'rgba(139, 92, 246, 0.1)',
                border: sendAmount === amount.toString()
                  ? '2px solid #8B5CF6'
                  : '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#8B5CF6',
                fontSize: '0.85em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {amount}
            </button>
          ))}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.5em',
          marginBottom: '0.8em'
        }}>
          {[1000, 2000, 5000, 10000].map(amount => (
            <button
              key={amount}
              onClick={() => setSendAmount(amount.toString())}
              style={{
                padding: '0.6em 0.4em',
                background: sendAmount === amount.toString() 
                  ? 'rgba(139, 92, 246, 0.3)' 
                  : 'rgba(139, 92, 246, 0.1)',
                border: sendAmount === amount.toString()
                  ? '2px solid #8B5CF6'
                  : '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                color: '#8B5CF6',
                fontSize: '0.85em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {amount >= 1000 ? `${amount/1000}K` : amount}
            </button>
          ))}
        </div>
        
        <input
          type="number"
          placeholder="Or type custom amount"
          value={sendAmount}
          onChange={(e) => setSendAmount(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '1em' }}>
        <label style={{ display: 'block', marginBottom: '0.5em', fontSize: '0.9em' }}>
          Recipient Nostr Public Key (npub):
        </label>
        <input
          type="text"
          placeholder="npub1..."
          value={recipientNpub}
          onChange={(e) => setRecipientNpub(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: '0.85em' }}
        />
        {profileInfo && (
          <div style={{
            marginTop: '0.5em',
            padding: '0.6em',
            background: 'rgba(81, 207, 102, 0.1)',
            borderRadius: '6px',
            fontSize: '0.85em'
          }}>
            <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> {profileInfo.displayName || profileInfo.name || 'Profile found'}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1em' }}>
        <label style={{ display: 'block', marginBottom: '0.5em', fontSize: '0.9em' }}>
          Message (optional):
        </label>
        <textarea
          placeholder="Add a note..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{ fontSize: '0.9em' }}
        />
      </div>

      <button
        className="primary-btn"
        onClick={handleGenerateAndSend}
        disabled={sending || !sendAmount || !recipientNpub.trim() || currentMintBalance === 0}
        style={{ marginBottom: '0.5em' }}
      >
        <Send size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> {sending ? 'Sending...' : 'Generate & Send via Nostr'}
      </button>

      <button
        className="back-btn"
        style={{ marginTop: '0.5em', position: 'relative', left: 0, transform: 'none' }}
        onClick={resetSendPage}
      >
        ← Change Method
      </button>
    </div>
  )
}

