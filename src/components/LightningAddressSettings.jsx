import { useState, useEffect } from 'react'
import { Copy, QrCode, Settings, X } from 'lucide-react'
import { getLightningAddress } from '../utils/npubcash.js'
import { generateQR } from '../utils/cashu.js'

export default function LightningAddressSettings({ onBack, setSuccess, setError }) {
  const [enabled, setEnabled] = useState(false)
  const [autoClaim, setAutoClaim] = useState(true)
  const [lightningAddress, setLightningAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Get nsec from localStorage
  const nsec = typeof window !== 'undefined' ? localStorage.getItem('nostr_nsec') : null

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isEnabled = localStorage.getItem('npubcash_enabled') === 'true'
      const isAutoClaim = localStorage.getItem('npubcash_autoclaim') !== 'false'
      setEnabled(isEnabled)
      setAutoClaim(isAutoClaim)

      // Load Lightning Address if enabled
      if (isEnabled && nsec) {
        setLoading(true)
        getLightningAddress(nsec)
          .then(addr => {
            if (addr) setLightningAddress(addr)
          })
          .catch(err => {
            console.error('Failed to load Lightning Address:', err)
          })
          .finally(() => setLoading(false))
      }
    }
  }, [nsec])

  const handleToggleEnabled = () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    localStorage.setItem('npubcash_enabled', newEnabled.toString())

    if (newEnabled && nsec) {
      setLoading(true)
      getLightningAddress(nsec)
        .then(addr => {
          if (addr) {
            setLightningAddress(addr)
            setSuccess('Lightning Address enabled!')
          }
        })
        .catch(err => {
          setError('Failed to load Lightning Address')
          console.error(err)
        })
        .finally(() => setLoading(false))
    } else if (!newEnabled) {
      setLightningAddress('')
      setSuccess('Lightning Address disabled')
    }
  }

  const handleToggleAutoClaim = () => {
    const newAutoClaim = !autoClaim
    setAutoClaim(newAutoClaim)
    localStorage.setItem('npubcash_autoclaim', newAutoClaim.toString())
    setSuccess(newAutoClaim ? 'Auto-claim enabled!' : 'Auto-claim disabled')
  }

  const handleCopyAddress = async () => {
    if (lightningAddress) {
      await navigator.clipboard.writeText(lightningAddress)
      setSuccess('Lightning Address copied!')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const handleShowQR = async () => {
    if (lightningAddress) {
      const qrUrl = await generateQR(lightningAddress)
      setQrCodeUrl(qrUrl)
      setShowQR(true)
    }
  }

  // No Nostr keys configured
  if (!nsec) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5em', color: '#FF8C00' }}>
          <Settings size={24} color="#FF8C00" /> Lightning Address Settings
        </h2>

        <div className="card">
          <h3>⚠️ Nostr Keys Required</h3>
          <p style={{ opacity: 0.7, marginBottom: '1em' }}>
            Lightning Address requires Nostr keys. Please configure your Nostr keys first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5em', color: '#FF8C00' }}>
        <Settings size={24} color="#FF8C00" /> Lightning Address Settings
      </h2>

      {/* Enable/Disable Toggle */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1em' }}>
          <div>
            <h3 style={{ margin: 0 }}>Enable Lightning Address</h3>
            <p style={{ fontSize: '0.85em', opacity: 0.7, margin: '0.3em 0 0 0' }}>
              Receive sats via npub.cash
            </p>
          </div>
          <button
            onClick={handleToggleEnabled}
            style={{
              background: enabled ? '#4CAF50' : '#666',
              border: 'none',
              borderRadius: '20px',
              width: '50px',
              height: '28px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: enabled ? '25px' : '3px',
              transition: 'left 0.3s'
            }} />
          </button>
        </div>
      </div>

      {/* Status Card */}
      {enabled && (
        <div className="card" style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)'
        }}>
          <div style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '0.3em' }}>Status</div>
          <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#4CAF50' }}>
            ✓ Lightning Address Enabled
          </div>
        </div>
      )}

      {/* Lightning Address Display */}
      {enabled && lightningAddress && (
        <div className="card">
          <h3>Your Lightning Address</h3>
          <div style={{
            background: 'rgba(255, 140, 0, 0.1)',
            padding: '1em',
            borderRadius: '8px',
            border: '1px solid rgba(255, 140, 0, 0.3)',
            wordBreak: 'break-all',
            fontSize: '0.9em',
            marginBottom: '0.5em'
          }}>
            {lightningAddress}
          </div>
          <div style={{ display: 'flex', gap: '0.5em' }}>
            <button className="primary-btn" style={{ flex: 1 }} onClick={handleCopyAddress}>
              <Copy size={16} style={{ marginRight: '0.3em' }} />
              Copy
            </button>
            <button className="secondary-btn" style={{ flex: 1 }} onClick={handleShowQR}>
              <QrCode size={16} style={{ marginRight: '0.3em' }} />
              QR Code
            </button>
          </div>
        </div>
      )}

      {/* Auto-Claim Toggle */}
      {enabled && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5em' }}>
            <div>
              <h3 style={{ margin: 0 }}>Auto-Claim</h3>
              <p style={{ fontSize: '0.85em', opacity: 0.7, margin: '0.3em 0 0 0' }}>
                {autoClaim ? 'Automatically receive incoming payments' : 'Manually approve each payment'}
              </p>
            </div>
            <button
              onClick={handleToggleAutoClaim}
              style={{
                background: autoClaim ? '#FF8C00' : '#666',
                border: 'none',
                borderRadius: '20px',
                width: '50px',
                height: '28px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
            >
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: autoClaim ? '25px' : '3px',
                transition: 'left 0.3s'
              }} />
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card" style={{
        background: 'rgba(255, 140, 0, 0.05)',
        border: '1px solid rgba(255, 140, 0, 0.2)'
      }}>
        <h3>💡 About Lightning Address</h3>
        <p style={{ fontSize: '0.85em', opacity: 0.8, lineHeight: '1.5' }}>
          Lightning Address lets you receive Bitcoin payments via a simple email-like address. 
          Your address is powered by npub.cash and works with any Lightning wallet.
        </p>
        <p style={{ fontSize: '0.85em', opacity: 0.8, lineHeight: '1.5', marginTop: '0.5em' }}>
          Want a custom username like <strong>yourname@npub.cash</strong>? Visit{' '}
          <a 
            href="https://npub.cash" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#FF8C00', textDecoration: 'underline' }}
          >
            npub.cash
          </a>
          {' '}to register.
        </p>
      </div>

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
              {lightningAddress}
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
