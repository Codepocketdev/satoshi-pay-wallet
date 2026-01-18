import { useState } from 'react'
import { getEncodedToken } from '@cashu/cashu-ts'
import { Wallet, Copy, Key } from 'lucide-react'
import { generateQR } from '../utils/cashu.js'
import { loadP2PKKeys, maybeConvertNpub, isValidPubkey } from '../utils/p2pk.js'

export default function SendViaEcash({
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
  const [generatedToken, setGeneratedToken] = useState('')
  const [generatedQR, setGeneratedQR] = useState('')
  const [lockToPubkey, setLockToPubkey] = useState('')
  const [showP2PKOption, setShowP2PKOption] = useState(false)

  const p2pkKeys = loadP2PKKeys()
  const hasP2PKKeys = p2pkKeys.length > 0

  const handleSendEcash = async () => {
    if (!wallet || !sendAmount) return

    try {
      setLoading(true)
      setError('')
      const amount = parseInt(sendAmount)
      const proofs = await getProofs(mintUrl)
      const currentBalance = currentMintBalance

      if (proofs.length === 0) {
        throw new Error('No tokens available. Mint some first!')
      }

      if (currentBalance < amount) {
        throw new Error(`Insufficient balance. You have ${currentBalance} sats.`)
      }

      // Check if P2PK lock is requested
      let sendOptions = {}
      let isP2PKLocked = false
      
      if (lockToPubkey.trim()) {
        const pubkey = maybeConvertNpub(lockToPubkey.trim())
        
        if (!isValidPubkey(pubkey)) {
          throw new Error('Invalid pubkey format. Use hex (02...) or npub1...')
        }

        console.log('[P2PK] Locking token to pubkey:', pubkey.substring(0, 16) + '...')
        sendOptions.pubkey = pubkey
        isP2PKLocked = true
      }

      // 2.7.4: wallet.send returns { send: [...], keep: [...] }
console.log('Calling wallet.send with options:', sendOptions)
const result = await wallet.send(amount, proofs, sendOptions)
console.log('wallet.send result:', result)

if (!result) {
  throw new Error('wallet.send returned nothing')
}

// 2.7.4: Result structure changed
let proofsToSend
let proofsToKeep

if (result.send && result.keep !== undefined) {
  // New 2.7.4 format: { send: [...], keep: [...] }
  proofsToSend = result.send
  proofsToKeep = result.keep
} else if (result.returnChange && result.send) {
  // Old format fallback: { send: [...], returnChange: [...] }
  proofsToSend = result.send
  proofsToKeep = result.returnChange
} else if (Array.isArray(result)) {
  // Direct array (shouldn't happen but handle it)
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

// Generate token
const token = getEncodedToken({
  mint: mintUrl,
  proofs: proofsToSend
})

console.log('Generated token:', token.substring(0, 50) + '...')

      const qr = await generateQR(token)
      setGeneratedToken(token)
      setGeneratedQR(qr)

      const txNote = isP2PKLocked 
        ? `P2PK-locked ecash generated (${lockToPubkey.substring(0, 16)}...)`
        : 'Ecash token generated'

      const txId = addTransaction('send', amount, txNote, mintUrl, 'pending')
      addPendingToken(token, amount, mintUrl, proofsToSend, txId)

      const successMsg = isP2PKLocked
        ? '🔒 Locked token generated! Only recipient can claim it.'
        : 'Token generated! Copy to send.'

      setSuccess(successMsg)
      setSendAmount('')
      setLockToPubkey('')

    } catch (err) {
      setError(`Send failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess('Token copied!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError('Failed to copy')
    }
  }

  return (
    <div className="card">
      <h3><Wallet size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Send Ecash</h3>
      <p style={{ marginBottom: '1em' }}>
        Generate a token to send
      </p>
      
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
                ? 'rgba(255, 140, 0, 0.3)' 
                : 'rgba(255, 140, 0, 0.1)',
              border: sendAmount === amount.toString()
                ? '2px solid #FF8C00'
                : '1px solid rgba(255, 140, 0, 0.3)',
              borderRadius: '8px',
              color: '#FF8C00',
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
        marginBottom: '1em'
      }}>
        {[1000, 2000, 5000, 10000].map(amount => (
          <button
            key={amount}
            onClick={() => setSendAmount(amount.toString())}
            style={{
              padding: '0.6em 0.4em',
              background: sendAmount === amount.toString() 
                ? 'rgba(255, 140, 0, 0.3)' 
                : 'rgba(255, 140, 0, 0.1)',
              border: sendAmount === amount.toString()
                ? '2px solid #FF8C00'
                : '1px solid rgba(255, 140, 0, 0.3)',
              borderRadius: '8px',
              color: '#FF8C00',
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
      
      <div style={{ position: 'relative', marginBottom: '1em' }}>
        <input
          type="number"
          placeholder="Or type custom amount"
          value={sendAmount}
          onChange={(e) => setSendAmount(e.target.value)}
          style={{ 
            paddingRight: '80px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            if (currentMintBalance > 0) {
              setSendAmount(currentMintBalance.toString())
            }
          }}
          disabled={currentMintBalance === 0}
          type="button"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: currentMintBalance === 0 ? 'rgba(255, 140, 0, 0.1)' : '#FF8C00',
            color: 'white',
            border: 'none',
            padding: '0.5em 0.8em',
            borderRadius: '6px',
            fontSize: '0.85em',
            cursor: currentMintBalance === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            zIndex: 1000,
            pointerEvents: currentMintBalance === 0 ? 'none' : 'auto',
            userSelect: 'none'
          }}
        >
          MAX
        </button>
      </div>

      {/* P2PK Lock Option */}
      {hasP2PKKeys && (
        <div style={{
          marginBottom: '1em',
          padding: '1em',
          background: 'rgba(139, 92, 246, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: showP2PKOption ? '1em' : 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <Key size={18} color="#A855F7" />
              <span style={{ fontWeight: 'bold', color: '#A855F7', fontSize: '0.9em' }}>
                P2PK Lock (Optional)
              </span>
            </div>
            <button
              onClick={() => setShowP2PKOption(!showP2PKOption)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#A855F7',
                padding: '0.4em 0.8em',
                borderRadius: '6px',
                fontSize: '0.8em',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {showP2PKOption ? 'Hide' : 'Lock Token'}
            </button>
          </div>

          {showP2PKOption && (
            <>
              <div style={{ 
                fontSize: '0.85em', 
                opacity: 0.8, 
                marginBottom: '0.8em',
                lineHeight: '1.4'
              }}>
                Lock this token to a specific pubkey. Only the holder of that key can claim it.
              </div>
              
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5em', 
                fontSize: '0.85em',
                opacity: 0.9
              }}>
                Recipient's Public Key (hex or npub):
              </label>
              <input
                type="text"
                placeholder="02... or npub1..."
                value={lockToPubkey}
                onChange={(e) => setLockToPubkey(e.target.value)}
                style={{
                  marginBottom: '0.5em',
                  fontFamily: 'monospace',
                  fontSize: '0.8em'
                }}
              />
              
              {lockToPubkey.trim() && (
                <div style={{
                  fontSize: '0.75em',
                  padding: '0.6em',
                  background: isValidPubkey(maybeConvertNpub(lockToPubkey.trim()))
                    ? 'rgba(81, 207, 102, 0.1)'
                    : 'rgba(255, 107, 107, 0.1)',
                  borderRadius: '6px',
                  color: isValidPubkey(maybeConvertNpub(lockToPubkey.trim()))
                    ? '#51cf66'
                    : '#FF6B6B'
                }}>
                  {isValidPubkey(maybeConvertNpub(lockToPubkey.trim()))
                    ? '✓ Valid pubkey - token will be locked'
                    : '✗ Invalid pubkey format'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button 
        className="primary-btn" 
        onClick={handleSendEcash} 
        disabled={loading || !sendAmount || currentMintBalance === 0}
        style={{
          ...(lockToPubkey.trim() && isValidPubkey(maybeConvertNpub(lockToPubkey.trim())) && {
            background: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
            borderColor: '#A855F7'
          })
        }}
      >
        {loading ? 'Generating...' : lockToPubkey.trim() ? '🔒 Generate Locked Token' : 'Generate Token'}
      </button>

      {generatedToken && (
        <div style={{ marginTop: '1em' }}>
          {lockToPubkey && (
            <div style={{
              marginBottom: '1em',
              padding: '0.8em',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid #8B5CF6',
              borderRadius: '8px',
              fontSize: '0.85em',
              color: '#A855F7'
            }}>
              <Key size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5em' }} />
              <strong>Token Locked!</strong> Only the recipient can claim it.
            </div>
          )}

          {generatedQR && (
            <div style={{ textAlign: 'center', marginBottom: '1em' }}>
              <img src={generatedQR} alt="QR Code" style={{ maxWidth: '280px', width: '100%', borderRadius: '8px' }} />
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
          <button className="copy-btn" onClick={() => copyToClipboard(generatedToken)}>
            <Copy size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Copy Token
          </button>
          <p style={{ fontSize: '0.75em', opacity: 0.5, marginTop: '0.5em', textAlign: 'center' }}>
            Token will auto-clear once recipient claims it
          </p>
        </div>
      )}

      <button className="back-btn" style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }} onClick={resetSendPage}>
        ← Change Method
      </button>
    </div>
  )
}

