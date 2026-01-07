import { useState, useEffect } from 'react'
import { CheckCircle, Copy, Zap, Eye, EyeOff, Dices, Save, Sparkles, Lightbulb } from 'lucide-react'
import { 
  generateNostrKeys, 
  isValidNsec, 
  getNpubFromNsec,
  formatPubkey 
} from '../utils/nostr.js'

export default function NostrSettings({ onClose }) {
  const [nsec, setNsec] = useState('')
  const [npub, setNpub] = useState('')
  const [showNsec, setShowNsec] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load saved keys on mount
  useEffect(() => {
    const savedNsec = localStorage.getItem('nostr_nsec')
    if (savedNsec) {
      setNsec(savedNsec)
      try {
        const derivedNpub = getNpubFromNsec(savedNsec)
        setNpub(derivedNpub)
      } catch (err) {
        console.error('Failed to derive npub:', err)
      }
    }
  }, [])

  const handleGenerateKeys = () => {
    try {
      const keys = generateNostrKeys()
      setNsec(keys.nsec)
      setNpub(keys.npub)
      setSuccess('New Nostr keys generated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to generate keys')
    }
  }

  const handleSaveKeys = () => {
    if (!nsec.trim()) {
      setError('Please enter or generate your nsec key')
      return
    }

    if (!isValidNsec(nsec)) {
      setError('Invalid nsec format')
      return
    }

    try {
      const derivedNpub = getNpubFromNsec(nsec)
      localStorage.setItem('nostr_nsec', nsec)
      localStorage.setItem('nostr_npub', derivedNpub)
      setNpub(derivedNpub)
      setSuccess('Nostr keys saved!')
      setError('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to save keys: ' + err.message)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('nostr_nsec')
    localStorage.removeItem('nostr_npub')
    setNsec('')
    setNpub('')
    setSuccess('Disconnected from Nostr')
    setTimeout(() => setSuccess(''), 3000)
  }

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(`${label} copied!`)
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError('Failed to copy')
    }
  }

  const isConnected = npub && localStorage.getItem('nostr_nsec')

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h1>🟣 Nostr Integration</h1>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h3>What is Nostr?</h3>
        <p style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '1em' }}>
          Nostr is a decentralized social protocol. Connect your Nostr identity to send ecash tokens via encrypted DMs!
        </p>

        {isConnected ? (
          <>
            <div style={{
              background: 'rgba(81, 207, 102, 0.1)',
              padding: '1em',
              borderRadius: '8px',
              marginBottom: '1em'
            }}>
              <div style={{ marginBottom: '0.5em', fontWeight: 'bold', color: '#51CF66' }}>
                <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em', color: '#51cf66' }} /> Connected
              </div>
              <div style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '0.5em' }}>
                Your Nostr Public Key:
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '0.5em',
                borderRadius: '4px',
                wordBreak: 'break-all',
                fontSize: '0.75em',
                fontFamily: 'monospace'
              }}>
                {npub}
              </div>
              <button 
                className="copy-btn"
                onClick={() => copyToClipboard(npub, 'Npub')}
                style={{ marginTop: '0.5em' }}
              >
                <Copy size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Copy Npub
              </button>
            </div>

            <button 
              className="secondary-btn"
              onClick={handleDisconnect}
              style={{ marginBottom: '0.5em' }}
            >
              <Zap size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Disconnect
            </button>
          </>
        ) : (
          <>
            <h3>Connect Your Nostr Identity</h3>

            <div style={{ marginBottom: '1em' }}>
              <label style={{ display: 'block', marginBottom: '0.5em', fontSize: '0.9em' }}>
                Private Key (nsec):
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNsec ? 'text' : 'password'}
                  placeholder="nsec1..."
                  value={nsec}
                  onChange={(e) => setNsec(e.target.value)}
                  style={{ paddingRight: '60px', fontFamily: 'monospace', fontSize: '0.85em' }}
                />
                <button
                  onClick={() => setShowNsec(!showNsec)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2em'
                  }}
                >
                  {showNsec ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ fontSize: '0.75em', opacity: 0.6, marginTop: '0.3em' }}>
                ⚠️ Never share your nsec! It's like your password.
              </p>
            </div>

            <button
              className="secondary-btn"
              onClick={handleGenerateKeys}
              style={{ marginBottom: '0.5em' }}
            >
              <Dices size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Generate New Keys
            </button>

            <button
              className="primary-btn"
              onClick={handleSaveKeys}
              disabled={!nsec.trim()}
            >
              <Save size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Save & Connect
            </button>

            <div style={{
              marginTop: '1em',
              padding: '0.8em',
              background: 'rgba(33, 150, 243, 0.1)',
              borderRadius: '8px',
              fontSize: '0.8em'
            }}>
              <strong>Don't have Nostr keys?</strong>
              <br />
              Click "Generate New Keys" or import from another Nostr app.
            </div>
          </>
        )}
      </div>

      {isConnected && (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <Sparkles size={20} /> Features Available
          </h3>
          <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
            <div style={{ marginBottom: '0.5em' }}>
              ✅ Send ecash via Nostr DMs
            </div>
            <div style={{ marginBottom: '0.5em' }}>
              ✅ Receive tokens from contacts
            </div>
            <div>
              ✅ Private & encrypted transfers
            </div>
          </div>
          <p style={{ fontSize: '0.75em', opacity: 0.6, marginTop: '1em' }}>
            <Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Use the Send page to send tokens via Nostr!
          </p>
        </div>
      )}
    </div>
  )
}

