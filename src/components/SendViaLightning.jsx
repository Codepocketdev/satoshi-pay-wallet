import { useState } from 'react'
import { Zap, Send, Lightbulb, Mail } from 'lucide-react'
import { vibrate } from '../utils/cashu.js'

// Counter management functions
const getKeysetCounter = (mintUrl) => {
  const key = `counter_${mintUrl}`
  return parseInt(localStorage.getItem(key) || '0')
}

const incrementCounter = (mintUrl, amount) => {
  const key = `counter_${mintUrl}`
  const current = getKeysetCounter(mintUrl)
  localStorage.setItem(key, (current + amount).toString())
}

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

export default function SendViaLightning({
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
  const [paymentNote, setPaymentNote] = useState('')
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
        quote: meltQuote,
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

    const counterValue = getKeysetCounter(mintUrl)
    let counterIncreased = false
    let proofsToSend = []

    try {
      setSendingPayment(true)
      setError('')

      const totalAmount = decodedInvoice.total

      if (currentMintBalance < totalAmount) {
        throw new Error(`Insufficient balance. Need ${totalAmount} sats (including ${decodedInvoice.fee} sats fee)`)
      }

      const proofs = await getProofs(mintUrl)

      if (!proofs || proofs.length === 0) {
        throw new Error('No proofs available')
      }

      const sendResult = await wallet.send(totalAmount, proofs)
      let proofsToKeep = []

      if (sendResult) {
        proofsToKeep = sendResult.keep || sendResult.returnChange || sendResult.change || []
        proofsToSend = sendResult.send || sendResult.sendProofs || []
      }

      if (!proofsToSend || proofsToSend.length === 0) {
        throw new Error('Failed to prepare proofs for payment')
      }

      const counterIncrease = proofsToSend.length + (decodedInvoice.fee > 0 ? Math.ceil(Math.log2(decodedInvoice.fee)) : 0)
      incrementCounter(mintUrl, counterIncrease)
      counterIncreased = true

      console.log('Melting with counter:', counterValue, 'increment:', counterIncrease)

      const meltResponse = await wallet.meltProofs(
        decodedInvoice.quote,
        proofsToSend,
        {
          keysetId: wallet.keys.id,
          counter: counterValue
        }
      )

      console.log('Melt response:', meltResponse)

      if (!meltResponse || !meltResponse.quote || meltResponse.quote.state !== 'PAID') {
        throw new Error('Invoice payment failed at the mint')
      }

      const changeProofs = meltResponse.change || []
      const allRemainingProofs = [...proofsToKeep, ...changeProofs]

      await saveProofs(mintUrl, allRemainingProofs)
      await calculateAllBalances()

      let description = decodedInvoice.isLnAddress
        ? `Sent to ${decodedInvoice.lnAddress}`
        : 'Paid Lightning invoice'

      if (paymentNote.trim()) {
        description += ` - ${paymentNote.trim()}`
      }

      addTransaction('send', decodedInvoice.amount, description, mintUrl)

      vibrate([100, 50, 100])

      setSuccess(`Sent ${decodedInvoice.amount} sats via Lightning!`)

      setTimeout(() => {
        resetSendPage()
        setDecodedInvoice(null)
        setLightningInvoice('')
        setLnAddressAmount('')
        setPaymentNote('')
      }, 2000)

    } catch (err) {
      console.error('Lightning payment error:', err)

      if (counterIncreased && err.message?.includes('already been signed')) {
        console.log('Rolling back counter due to error')
        incrementCounter(mintUrl, -counterIncrease)
      }

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

  return (
    <div className="card">
      <h3>Send via Lightning</h3>

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
                Lightning Address detected! Select amount below.
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5em',
                marginBottom: '0.5em'
              }}>
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setLnAddressAmount(amount.toString())}
                    style={{
                      padding: '0.6em 0.4em',
                      background: lnAddressAmount === amount.toString()
                        ? 'rgba(255, 140, 0, 0.3)'
                        : 'rgba(255, 140, 0, 0.1)',
                      border: lnAddressAmount === amount.toString()
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
                marginBottom: '0.8em'
              }}>
                {[1000, 2000, 5000, 10000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setLnAddressAmount(amount.toString())}
                    style={{
                      padding: '0.6em 0.4em',
                      background: lnAddressAmount === amount.toString()
                        ? 'rgba(255, 140, 0, 0.3)'
                        : 'rgba(255, 140, 0, 0.1)',
                      border: lnAddressAmount === amount.toString()
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

              <div style={{ position: 'relative', marginBottom: '1em', isolation: 'isolate' }}>
                <input
                  type="number"
                  placeholder="Or type custom amount"
                  value={lnAddressAmount}
                  onChange={(e) => setLnAddressAmount(e.target.value)}
                  style={{
                    marginBottom: 0,
                    paddingRight: '80px',
                    width: '100%',
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 1
                  }}
                />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const maxSendable = currentMintBalance - 2
                    if (maxSendable > 0) {
                      setLnAddressAmount(maxSendable.toString())
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
                    zIndex: 2,
                    pointerEvents: currentMintBalance === 0 ? 'none' : 'auto',
                    userSelect: 'none'
                  }}
                >
                  MAX
                </button>
              </div>
            </>
          )}

          <div style={{ marginBottom: '1em' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5em',
              fontSize: '0.9em',
              opacity: 0.8
            }}>
              Payment Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Coffee, Dinner, Rent..."
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              maxLength={50}
              style={{
                marginBottom: 0,
                fontSize: '0.9em'
              }}
            />
            <p style={{ fontSize: '0.7em', opacity: 0.5, marginTop: '0.3em' }}>
              Helps you track what you spent on
            </p>
          </div>

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

          {paymentNote.trim() && (
            <div style={{
              marginBottom: '1em',
              padding: '0.6em',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              fontSize: '0.85em'
            }}>
              <span style={{ opacity: 0.8 }}>Note: </span>
              <span style={{ fontWeight: 'bold' }}>{paymentNote}</span>
            </div>
          )}

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
              setPaymentNote('')
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
