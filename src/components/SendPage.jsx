import { useState, useEffect } from 'react'
import { getEncodedToken } from '@cashu/cashu-ts'
import { Zap, Wallet, Copy, Send, CheckCircle, Search, Lightbulb, Mail, Repeat } from 'lucide-react'
import { generateQR, vibrate } from '../utils/cashu.js'
import {
  sendNostrToken,
  isValidNpub,
  formatPubkey,
  getNostrProfile
} from '../utils/nostr.js'

// Lightning Address utilities
function isLightningAddress(str) {
  if (!str || typeof str !== 'string') return false
  const parts = str.trim().split('@')
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.')
}

async function getInvoiceFromLightningAddress(address, amountSats) {
  const [username, domain] = address.split('@')
  const url = `https://${domain}/.well-known/lnurlp/${username}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch Lightning Address: ${response.status}`)
  }

  const data = await response.json()

  if (!data.callback) {
    throw new Error('Invalid Lightning Address response')
  }

  const minSendable = Math.floor(data.minSendable / 1000)
  const maxSendable = Math.floor(data.maxSendable / 1000)

  if (amountSats < minSendable) {
    throw new Error(`Amount too low. Minimum: ${minSendable} sats`)
  }

  if (amountSats > maxSendable) {
    throw new Error(`Amount too high. Maximum: ${maxSendable} sats`)
  }

  const amountMsats = amountSats * 1000
  const callbackUrl = new URL(data.callback)
  callbackUrl.searchParams.set('amount', amountMsats.toString())

  const invoiceResponse = await fetch(callbackUrl.toString())
  if (!invoiceResponse.ok) {
    throw new Error(`Failed to get invoice: ${invoiceResponse.status}`)
  }

  const invoiceData = await invoiceResponse.json()

  if (invoiceData.status === 'ERROR') {
    throw new Error(invoiceData.reason || 'Lightning Address error')
  }

  if (!invoiceData.pr) {
    throw new Error('No invoice returned')
  }

  return invoiceData.pr
}

// Nostr Send Component
function SendViaNostr({
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
      const proofs = getProofs(mintUrl)

      if (proofs.length === 0) {
        throw new Error('No tokens available. Mint some first!')
      }

      if (currentMintBalance < amount) {
        throw new Error(`Insufficient balance. You have ${currentMintBalance} sats.`)
      }

      const result = await wallet.send(amount, proofs)

      if (!result) {
        throw new Error('Failed to generate token')
      }

      const { keep, send, returnChange } = result
      const proofsToKeep = keep || returnChange || []
      const proofsToSend = send || []

      if (!proofsToSend || proofsToSend.length === 0) {
        throw new Error('Failed to create send proofs')
      }

      saveProofs(mintUrl, proofsToKeep)
      calculateAllBalances()

      const token = getEncodedToken({
        token: [{ mint: mintUrl, proofs: proofsToSend }]
      })

      await sendNostrToken(nsec, recipientNpub, token, message)

      addTransaction('send', amount, `Sent to ${formatPubkey(recipientNpub)} via Nostr`, mintUrl)

      setSuccess('Token sent via Nostr DM!')
      vibrate([100, 50, 100])

      setTimeout(() => {
        resetSendPage()
      }, 2000)

    } catch (err) {
      setError(`Failed: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="card">
        <h3>🟣 Send via Nostr</h3>
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
      <h3>🟣 Send via Nostr DM</h3>
      <p style={{ marginBottom: '1em', fontSize: '0.9em' }}>
        Send ecash tokens via encrypted Nostr DM
      </p>

      <div style={{ marginBottom: '1em' }}>
        <label style={{ display: 'block', marginBottom: '0.5em', fontSize: '0.9em' }}>
          Amount (sats):
        </label>
        <input
          type="number"
          placeholder="Amount in sats"
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

// Lightning Send Component
function SendViaLightning({
  wallet,
  mintUrl,
  currentMintBalance,
  getProofs,
  saveProofs,
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
  const [lnAddressAmount, setLnAddressAmount] = useState('')
  const isLnAddress = isLightningAddress(lightningInvoice)

  const handleDecodeInvoice = async () => {
    if (!lightningInvoice.trim()) {
      setError('Please paste a Lightning invoice or enter a Lightning Address')
      return
    }

    try {
      setLoading(true)
      setError('')

      let invoiceToPay = lightningInvoice.trim()

      if (isLnAddress) {
        if (!lnAddressAmount || parseInt(lnAddressAmount) <= 0) {
          setError('Please enter an amount for Lightning Address')
          setLoading(false)
          return
        }

        setSuccess('Resolving Lightning Address...')

        invoiceToPay = await getInvoiceFromLightningAddress(
          lightningInvoice.trim(),
          parseInt(lnAddressAmount)
        )

        setSuccess('Lightning Address resolved!')
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const invoice = invoiceToPay.toLowerCase()
      if (!invoice.startsWith('ln')) {
        throw new Error('Invalid Lightning invoice format')
      }

      const meltQuote = await wallet.createMeltQuote(invoiceToPay)

      setDecodedInvoice({
        amount: meltQuote.amount,
        fee: meltQuote.fee_reserve,
        total: meltQuote.amount + meltQuote.fee_reserve,
        quote: meltQuote.quote,
        isLnAddress: isLnAddress,
        lnAddress: isLnAddress ? lightningInvoice.trim() : null
      })

      setSuccess('Invoice decoded! Review and confirm.')

    } catch (err) {
      setError(`Failed: ${err.message}`)
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

      const proofs = getProofs(mintUrl)

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

      saveProofs(mintUrl, allRemainingProofs)
      calculateAllBalances()

      const description = decodedInvoice.isLnAddress
        ? `Sent to ${decodedInvoice.lnAddress}`
        : 'Paid Lightning invoice'

      addTransaction('send', decodedInvoice.amount, description, mintUrl)

      vibrate([100, 50, 100])

      setSuccess(`Sent ${decodedInvoice.amount} sats via Lightning!`)

      setTimeout(() => {
        resetSendPage()
        setDecodedInvoice(null)
        setLightningInvoice('')
        setLnAddressAmount('')
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

  const handleSendMax = () => {
    const maxSendable = currentMintBalance - 2
    if (maxSendable > 0) {
      setLnAddressAmount(maxSendable.toString())
    }
  }

  return (
    <div className="card">
      <h3>⚡ Send via Lightning</h3>

      {!decodedInvoice ? (
        <>
          <p style={{ marginBottom: '1em' }}>
            Paste a Lightning invoice or enter a Lightning Address
          </p>
          <div className="token-box">
            <textarea
              placeholder="Lightning invoice (lnbc...) or user@domain.com"
              value={lightningInvoice}
              onChange={(e) => setLightningInvoice(e.target.value)}
              rows={4}
              style={{ fontSize: '0.75em' }}
            />
          </div>

          {isLnAddress && (
            <>
              <div style={{
                marginTop: '0.5em',
                marginBottom: '1em',
                padding: '0.8em',
                background: 'rgba(81, 207, 102, 0.1)',
                borderRadius: '8px',
                fontSize: '0.85em'
              }}>
                ⚡ Lightning Address detected! Enter amount below.
              </div>
              <div style={{ position: 'relative', marginBottom: '1em' }}>
                <input
                  type="number"
                  placeholder="Amount in sats"
                  value={lnAddressAmount}
                  onChange={(e) => setLnAddressAmount(e.target.value)}
                  style={{
                    marginBottom: 0,
                    paddingRight: '70px'
                  }}
                />
                <button
                  onClick={handleSendMax}
                  disabled={currentMintBalance === 0}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 140, 0, 0.2)',
                    color: '#FF8C00',
                    border: '1px solid rgba(255, 140, 0, 0.3)',
                    padding: '0.3em 0.8em',
                    borderRadius: '6px',
                    fontSize: '0.85em',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    opacity: currentMintBalance === 0 ? 0.5 : 1
                  }}
                >
                  MAX
                </button>
              </div>
            </>
          )}

          <button
            className="primary-btn"
            onClick={handleDecodeInvoice}
            disabled={loading || !lightningInvoice.trim() || (isLnAddress && !lnAddressAmount)}
          >
            {loading ? 'Processing...' : isLnAddress ? 'Get Invoice' : 'Decode Invoice'}
          </button>
        </>
      ) : (
        <>
          {decodedInvoice.isLnAddress && (
            <div style={{
              marginBottom: '1em',
              padding: '0.8em',
              background: 'rgba(81, 207, 102, 0.1)',
              borderRadius: '8px',
              fontSize: '0.85em'
            }}>
              <Mail size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Paying to: <strong>{decodedInvoice.lnAddress}</strong>
            </div>
          )}

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
              <span style={{ opacity: 0.7 }}>Network Fee (est):</span>
              <span style={{ float: 'right' }}>{decodedInvoice.fee} sats</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5em', marginTop: '0.5em' }}>
              <span style={{ opacity: 0.7 }}>Total:</span>
              <span style={{ float: 'right', fontWeight: 'bold', color: '#FF8C00' }}>{decodedInvoice.total} sats</span>
            </div>
          </div>

          <div style={{
            marginBottom: '1em',
            padding: '0.6em',
            background: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '8px',
            fontSize: '0.75em',
            opacity: 0.8
          }}>
            <Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Actual fee may be lower. Any difference will be returned as change.
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
              setLnAddressAmount('')
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

// Main Send Page Component
export default function SendPage({
  wallet,
  mintUrl,
  currentMintBalance,
  getProofs,
  saveProofs,
  calculateAllBalances,
  addTransaction,
  addPendingToken,
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
  const [sendAmount, setSendAmount] = useState('')
  const [generatedToken, setGeneratedToken] = useState('')
  const [generatedQR, setGeneratedQR] = useState('')
  const [lightningInvoice, setLightningInvoice] = useState('')
  const [decodedInvoice, setDecodedInvoice] = useState(null)
  const [showMintSelector, setShowMintSelector] = useState(false)

  const resetSendPage = () => {
    setGeneratedToken('')
    setGeneratedQR('')
    setSendAmount('')
    setSendMethod(null)
    setLightningInvoice('')
    setDecodedInvoice(null)
    setError('')
    setSuccess('')
  }

  const handleSendEcash = async () => {
    if (!wallet || !sendAmount) return

    try {
      setLoading(true)
      setError('')
      const amount = parseInt(sendAmount)
      const proofs = getProofs(mintUrl)
      const currentBalance = currentMintBalance

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

      saveProofs(mintUrl, proofsToKeep)
      calculateAllBalances()

      const token = getEncodedToken({
        token: [{ mint: mintUrl, proofs: proofsToSend }]
      })

      const qr = await generateQR(token)
      setGeneratedToken(token)
      setGeneratedQR(qr)

      const txId = addTransaction('send', amount, 'Ecash token generated', mintUrl, 'pending')
      addPendingToken(token, amount, mintUrl, proofsToSend, txId)

      setSuccess('Token generated! Copy to send.')
      setSendAmount('')

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

  const handleSendMaxEcash = () => {
    if (currentMintBalance > 0) {
      setSendAmount(currentMintBalance.toString())
    }
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

      {/* Mint Selector Card */}
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
            ⚡ Send via Lightning
          </button>

          <button
            className="primary-btn"
            onClick={() => setSendMethod('nostr')}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              borderColor: '#8B5CF6'
            }}
          >
            🟣 Send via Nostr
          </button>
        </div>
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
      ) : sendMethod === 'nostr' ? (
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
      ) : (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <Wallet size={20} /> Send Ecash
          </h3>
          <p style={{ marginBottom: '1em' }}>
            Generate a token to send
          </p>
          <div style={{ position: 'relative', marginBottom: '1em' }}>
            <input
              type="number"
              placeholder="Amount in sats"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              style={{
                marginBottom: 0,
                paddingRight: '70px'
              }}
            />
            <button
              onClick={handleSendMaxEcash}
              disabled={currentMintBalance === 0}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255, 140, 0, 0.2)',
                color: '#FF8C00',
                border: '1px solid rgba(255, 140, 0, 0.3)',
                padding: '0.3em 0.8em',
                borderRadius: '6px',
                fontSize: '0.85em',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: currentMintBalance === 0 ? 0.5 : 1
              }}
            >
              MAX
            </button>
          </div>
          <button className="primary-btn" onClick={handleSendEcash} disabled={loading || !sendAmount || currentMintBalance === 0}>
            {loading ? 'Generating...' : 'Generate Token'}
          </button>

          {generatedToken && (
            <div style={{ marginTop: '1em' }}>
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
                <Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Token will auto-clear once recipient claims it
              </p>
            </div>
          )}

          <button className="back-btn" style={{ marginTop: '1em', position: 'relative', left: 0, transform: 'none' }} onClick={resetSendPage}>
            ← Change Method
          </button>
        </div>
      )}
    </div>
  )
}
