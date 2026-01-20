import { useState, useEffect } from 'react'
import { Copy, QrCode, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useNpubcash } from '../hooks/useNpubcash.js'
import { getLightningAddress } from '../utils/npubcash.js'
import { generateQR } from '../utils/cashu.js'

export default function ReceiveLightning({
  onNavigate,
  onClose,
  onTokenReceived,
  setSuccess,
  setError
}) {
  const [showCustomAddressInfo, setShowCustomAddressInfo] = useState(false)
  const [showClaimedTokens, setShowClaimedTokens] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [lightningAddress, setLightningAddress] = useState('')
  const [npubcashEnabled, setNpubcashEnabled] = useState(false)

  // Get nsec from localStorage
  const nsec = typeof window !== 'undefined' ? localStorage.getItem('nostr_nsec') : null

  // Initialize npub.cash hook
  const npubcash = useNpubcash({
    nsec: nsec || '',
    enabled: npubcashEnabled && !!nsec,
    onTokenClaimed: async (token, amount) => {
      // This is only called when AUTO-CLAIM is ON
      // It should auto-receive the token
      setSuccess(`Auto-receiving ${amount} sats from Lightning Address!`)
      if (onTokenReceived) {
        onTokenReceived(token)
      }
    }
  })

  // Load Lightning Address
  useEffect(() => {
    const enabled = localStorage.getItem('npubcash_enabled') === 'true'
    setNpubcashEnabled(enabled)

    if (nsec && enabled) {
      getLightningAddress(nsec).then(addr => {
        if (addr) setLightningAddress(addr)
      })
    }
  }, [nsec])

  const handleCopyAddress = async () => {
    const addr = lightningAddress || npubcash.lightningAddress
    if (addr) {
      await navigator.clipboard.writeText(addr)
      setSuccess('Address copied!')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const handleShowQR = async () => {
    const addr = lightningAddress || npubcash.lightningAddress
    if (addr) {
      const qrUrl = await generateQR(addr)
      setQrCodeUrl(qrUrl)
      setShowQR(true)
    }
  }

  const handleManualClaim = async () => {
    const result = await npubcash.manualClaim()
    if (result.success && result.token) {
      if (onTokenReceived) {
        onTokenReceived(result.token)
      }
    } else if (result.error) {
      setError(result.error)
    }
  }

  // No Nostr keys configured
  if (!nsec) {
    return (
      <div>
        <h3>⚡ Receive via Lightning</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.7 }}>
          Lightning Address requires Nostr keys
        </p>
        <button
          className="primary-btn"
          onClick={() => onNavigate && onNavigate('nostr')}
        >
          Configure Nostr Keys
        </button>
      </div>
    )
  }

  // npub.cash disabled
  if (!npubcashEnabled) {
    return (
      <div>
        <h3>⚡ Receive via Lightning</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.7 }}>
          Enable Lightning Address in Settings to receive
        </p>
        <button
          className="primary-btn"
          onClick={() => onNavigate && onNavigate('settings')}
        >
          Go to Settings
        </button>
      </div>
    )
  }

  // npub.cash enabled - show Lightning Address
  return (
    <div>
      <h3>⚡ Receive via Lightning</h3>

      <div style={{ marginBottom: '1em' }}>
        <p style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '0.5em' }}>
          Your Lightning Address
        </p>
        <div style={{
          background: 'rgba(255, 140, 0, 0.1)',
          padding: '1em',
          borderRadius: '8px',
          border: '1px solid rgba(255, 140, 0, 0.3)',
          wordBreak: 'break-all',
          fontSize: '0.9em'
        }}>
          {lightningAddress || npubcash.lightningAddress || 'Loading...'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5em', marginBottom: '1em' }}>
        <button
          className="primary-btn"
          style={{ flex: 1 }}
          onClick={handleCopyAddress}
        >
          <Copy size={16} style={{ marginRight: '0.3em' }} />
          Copy
        </button>
        <button
          className="secondary-btn"
          style={{ flex: 1 }}
          onClick={handleShowQR}
        >
          <QrCode size={16} style={{ marginRight: '0.3em' }} />
          QR Code
        </button>
      </div>

      <div style={{
        marginBottom: '1em',
        padding: '0.8em',
        background: 'rgba(76, 175, 80, 0.1)',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '0.85em', opacity: 0.7 }}>Waiting</div>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#4CAF50' }}>
          {npubcash.balance} sats
        </div>
        {npubcash.balance > 0 && (
          <button
            className="primary-btn"
            style={{ marginTop: '0.5em', width: '100%', fontSize: '0.85em' }}
            onClick={handleManualClaim}
            disabled={npubcash.loading}
          >
            {npubcash.loading ? 'Claiming...' : 'Claim Now'}
          </button>
        )}
      </div>

      {/* Claimed Tokens Section */}
      {npubcash.claimedTokens && npubcash.claimedTokens.length > 0 && (
        <div style={{ marginBottom: '1em' }}>
          <button
            onClick={() => setShowClaimedTokens(!showClaimedTokens)}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFA500',
              fontSize: '0.9em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3em',
              padding: '0.5em 0',
              width: '100%',
              fontWeight: 'bold'
            }}
          >
            {showClaimedTokens ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Claimed Tokens ({npubcash.claimedTokens.length})
          </button>

          {showClaimedTokens && (
            <div style={{
              marginTop: '0.5em',
              padding: '1em',
              background: 'rgba(255, 165, 0, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 165, 0, 0.3)'
            }}>
              {npubcash.claimedTokens.map(token => (
                <div
                  key={token.id}
                  style={{
                    padding: '0.8em',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    marginBottom: '0.5em',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#FFA500' }}>
                      {token.amount} sats
                    </div>
                    <div style={{ fontSize: '0.75em', opacity: 0.6 }}>
                      {new Date(token.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5em' }}>
                    <button
                      className="primary-btn"
                      style={{ padding: '0.5em 1em', fontSize: '0.85em' }}
                      onClick={() => {
                        // Pass token to parent's handleReceiveLightning
                        if (onTokenReceived) {
                          onTokenReceived(token.token)
                        }
                        // Remove from claimed list
                        npubcash.deleteToken(token.id)
                      }}
                    >
                      Receive
                    </button>
                    <button
                      className="cancel-btn"
                      style={{ padding: '0.5em 1em', fontSize: '0.85em' }}
                      onClick={() => {
                        if (confirm('Delete this token? This cannot be undone!')) {
                          npubcash.deleteToken(token.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowCustomAddressInfo(!showCustomAddressInfo)}
        style={{
          background: 'none',
          border: 'none',
          color: '#FF8C00',
          fontSize: '0.85em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3em',
          marginBottom: '0.5em',
          padding: '0.5em 0'
        }}
      >
        {showCustomAddressInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Want a custom username?
      </button>

      {showCustomAddressInfo && (
        <div style={{
          padding: '1em',
          background: 'rgba(255, 140, 0, 0.05)',
          borderRadius: '8px',
          fontSize: '0.85em',
          marginBottom: '1em'
        }}>
          <p style={{ marginBottom: '0.5em', fontWeight: 'bold' }}>
            💡 Get hodlcurator@npub.cash instead!
          </p>
          <ol style={{ paddingLeft: '1.5em', margin: '0.5em 0' }}>
            <li>Visit npub.cash</li>
            <li>Connect with your Nostr keys</li>
            <li>Register your username</li>
          </ol>
          <button
            className="primary-btn"
            style={{ marginTop: '0.5em', width: '100%', fontSize: '0.85em' }}
            onClick={() => window.open('https://npub.cash', '_blank')}
          >
            Visit npub.cash ↗
          </button>
        </div>
      )}

      <p style={{ fontSize: '0.75em', opacity: 0.5, textAlign: 'center', marginTop: '1em' }}>
        Powered by npub.cash
      </p>

      {/* QR Code Modal */}
      {showQR && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1em'
          }}
          onClick={() => setShowQR(false)}
        >
          <div
            style={{
              background: '#1a1a1a',
              padding: '1.5em',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              style={{
                position: 'absolute',
                top: '0.5em',
                right: '0.5em',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5em'
              }}
            >
              <X size={24} />
            </button>

            <h3 style={{ marginTop: 0, textAlign: 'center', color: '#FF8C00' }}>
              Lightning Address QR
            </h3>

            <div style={{ textAlign: 'center', marginBottom: '1em' }}>
              <img
                src={qrCodeUrl}
                alt="Lightning Address QR Code"
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: 'auto',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div
              style={{
                background: 'rgba(255, 140, 0, 0.1)',
                padding: '0.8em',
                borderRadius: '8px',
                wordBreak: 'break-all',
                fontSize: '0.85em',
                textAlign: 'center',
                marginBottom: '1em'
              }}
            >
              {lightningAddress || npubcash.lightningAddress}
            </div>

            <button
              className="primary-btn"
              onClick={() => setShowQR(false)}
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
