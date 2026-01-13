import { useState } from 'react'
import { ArrowLeft, Copy, Eye, EyeOff, Key, Settings } from 'lucide-react'
import { nip19 } from 'nostr-tools'

// Custom helper functions
const bytesToHex = (bytes) => {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

export default function P2PKKeyPage({ keyData, onClose, onGoToSettings, setSuccess }) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)

  const getNpub = () => {
    try {
      const pubkeyHex = keyData.publicKey.substring(2) // Remove "02" prefix
      return nip19.npubEncode(pubkeyHex)
    } catch (err) {
      return 'Error'
    }
  }

  const getNsec = () => {
    try {
      const privkeyBytes = hexToBytes(keyData.privateKey)
      return nip19.nsecEncode(privkeyBytes)
    } catch (err) {
      return 'Error'
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    setSuccess(`${label} copied!`)
    setTimeout(() => setSuccess(''), 2000)
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>P2PK Key</h1>
      </header>

      {/* Info Card */}
      <div className="card" style={{ borderColor: '#8B5CF6', background: 'rgba(139, 92, 246, 0.05)' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1em', 
          marginBottom: '1em' 
        }}>
          <Key size={32} color="#8B5CF6" />
          <div>
            <h3 style={{ margin: 0, color: '#8B5CF6' }}>Share This Key</h3>
            <p style={{ margin: '0.3em 0 0 0', fontSize: '0.85em', opacity: 0.8 }}>
              Give your public key to the sender
            </p>
          </div>
        </div>
      </div>

      {/* Public Key (Hex) */}
      <div className="card">
        <h3 style={{ fontSize: '0.9em', marginBottom: '0.5em', opacity: 0.7 }}>
          Public Key (Cashu Format)
        </h3>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '0.8em',
          wordBreak: 'break-all',
          fontFamily: 'monospace',
          fontSize: '0.8em',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '0.5em'
        }}>
          {keyData.publicKey}
        </div>
        <button
          className="primary-btn"
          onClick={() => copyToClipboard(keyData.publicKey, 'Public key')}
          style={{ width: '100%' }}
        >
          <Copy size={16} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
          Copy Public Key
        </button>
      </div>

      {/* Npub */}
      <div className="card">
        <h3 style={{ fontSize: '0.9em', marginBottom: '0.5em', opacity: 0.7 }}>
          Public Key (Nostr Format)
        </h3>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '0.8em',
          wordBreak: 'break-all',
          fontFamily: 'monospace',
          fontSize: '0.8em',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '0.5em'
        }}>
          {getNpub()}
        </div>
        <button
          className="secondary-btn"
          onClick={() => copyToClipboard(getNpub(), 'Npub')}
          style={{ width: '100%' }}
        >
          <Copy size={16} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
          Copy Npub
        </button>
      </div>

      {/* Private Key Section */}
      <div className="card" style={{ borderColor: '#ff6b6b' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '0.5em' 
        }}>
          <h3 style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>
            Private Key (Nsec)
          </h3>
          <button
            onClick={() => setShowPrivateKey(!showPrivateKey)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0.3em 0.6em',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3em'
            }}
          >
            {showPrivateKey ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPrivateKey ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showPrivateKey ? (
          <>
            <div style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '0.8em',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.8em',
              marginBottom: '0.5em'
            }}>
              {getNsec()}
            </div>
            <div style={{
              fontSize: '0.75em',
              opacity: 0.7,
              marginBottom: '0.5em',
              color: '#FF6B6B'
            }}>
              ⚠️ Never share your private key! Anyone with it can spend locked ecash.
            </div>
            <button
              className="secondary-btn"
              onClick={() => copyToClipboard(getNsec(), 'Private key')}
              style={{ width: '100%' }}
            >
              <Copy size={16} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
              Copy Private Key
            </button>
          </>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '1em',
            textAlign: 'center',
            fontSize: '0.85em',
            opacity: 0.7,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            Hidden for security
          </div>
        )}
      </div>

      {/* Manage Keys Button */}
      <div className="card">
        <button
          className="secondary-btn"
          onClick={onGoToSettings}
          style={{ 
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em'
          }}
        >
          <Settings size={18} />
          Manage All Keys
        </button>
      </div>

      {/* How to Use */}
      <div className="card" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: '#8B5CF6' }}>
        <h3 style={{ color: '#8B5CF6', fontSize: '0.9em' }}>How It Works</h3>
        <ol style={{ fontSize: '0.85em', lineHeight: '1.6', paddingLeft: '1.5em', margin: '0.5em 0 0 0' }}>
          <li>Copy your public key (above)</li>
          <li>Send it to the person paying you</li>
          <li>They lock ecash to your key</li>
          <li>You receive & unlock it automatically</li>
        </ol>
      </div>
    </div>
  )
}

