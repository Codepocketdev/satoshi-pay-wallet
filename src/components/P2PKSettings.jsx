import { useState, useEffect } from 'react'
import { ArrowLeft, Key, Plus, Trash2, Eye, EyeOff, Copy, AlertTriangle, CheckCircle } from 'lucide-react'
import { nip19 } from 'nostr-tools'
import { 
  loadP2PKKeys, 
  generateP2PKKeypair, 
  importNsec, 
  deleteP2PKKey,
  getP2PKSettings,
  setP2PKSettings
} from '../utils/p2pk.js'

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

export default function P2PKSettings({ onClose, setSuccess, setError }) {
  const [p2pkKeys, setP2pkKeys] = useState([])
  const [p2pkQuickAccess, setP2pkQuickAccess] = useState(false)
  const [expandedKey, setExpandedKey] = useState(null)
  const [showPrivateKey, setShowPrivateKey] = useState({})

  useEffect(() => {
    loadKeys()
    const settings = getP2PKSettings()
    setP2pkQuickAccess(settings.showQuickAccess)
  }, [])

  const loadKeys = () => {
    const keys = loadP2PKKeys()
    setP2pkKeys(keys)
  }

  const handleGenerateKey = () => {
    const newKey = generateP2PKKeypair()
    loadKeys()
    setExpandedKey(newKey.publicKey)
    setSuccess && setSuccess('P2PK key generated!')
    setTimeout(() => setSuccess && setSuccess(''), 2000)
  }

  const handleImportNsec = () => {
    const nsec = prompt('Enter your nsec key:')
    if (!nsec) return
    
    try {
      const newKey = importNsec(nsec)
      loadKeys()
      setExpandedKey(newKey.publicKey)
      setSuccess && setSuccess('Nsec imported successfully!')
      setTimeout(() => setSuccess && setSuccess(''), 2000)
    } catch (err) {
      setError && setError(err.message)
      setTimeout(() => setError && setError(''), 3000)
    }
  }

  const handleDeleteKey = (publicKey) => {
    if (confirm('Delete this P2PK key?\n\nAny ecash locked to this key will become unspendable!\n\nThis cannot be undone!')) {
      deleteP2PKKey(publicKey)
      loadKeys()
      setExpandedKey(null)
      setSuccess && setSuccess('Key deleted')
      setTimeout(() => setSuccess && setSuccess(''), 2000)
    }
  }

  const handleQuickAccessToggle = (enabled) => {
    setP2pkQuickAccess(enabled)
    setP2PKSettings({ showQuickAccess: enabled })
  }

  const toggleKeyExpansion = (publicKey) => {
    setExpandedKey(expandedKey === publicKey ? null : publicKey)
  }

  const togglePrivateKeyVisibility = (publicKey) => {
    setShowPrivateKey(prev => ({
      ...prev,
      [publicKey]: !prev[publicKey]
    }))
  }

  const getNpub = (publicKey) => {
    try {
      const pubkeyHex = publicKey.substring(2) // Remove "02" prefix
      return nip19.npubEncode(pubkeyHex)
    } catch (err) {
      return 'Error'
    }
  }

  const getNsec = (privateKey) => {
    try {
      const privkeyBytes = hexToBytes(privateKey)
      return nip19.nsecEncode(privkeyBytes)
    } catch (err) {
      return 'Error'
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    setSuccess && setSuccess(`${label} copied!`)
    setTimeout(() => setSuccess && setSuccess(''), 2000)
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>P2PK Keys</h1>
      </header>

      {/* Info Card */}
      <div className="card" style={{ borderColor: '#8B5CF6' }}>
        <h3 style={{ color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <Key size={20} /> What is P2PK?
        </h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8, lineHeight: '1.5' }}>
          P2PK (Pay-to-Public-Key) lets you lock ecash to a specific key. Only the holder of the private key can spend it, making payments more secure.
        </p>

        {/* Warning */}
        <div style={{
          background: 'rgba(255, 165, 0, 0.1)',
          border: '1px solid #FFA500',
          borderRadius: '8px',
          padding: '0.8em',
          fontSize: '0.85em',
          lineHeight: '1.5'
        }}>
          <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
          <strong>Experimental:</strong> Only use with small amounts. If you lose your private keys, locked ecash cannot be recovered.
        </div>
      </div>

      {/* Actions Card */}
      <div className="card">
        <h3>Manage Keys</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5em', marginBottom: '1em' }}>
          <button className="primary-btn" onClick={handleGenerateKey}>
            <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
            Generate Key
          </button>
          <button className="secondary-btn" onClick={handleImportNsec}>
            Import Nsec
          </button>
        </div>

        {/* Quick Access Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.8em',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={p2pkQuickAccess}
            onChange={(e) => handleQuickAccessToggle(e.target.checked)}
            style={{ marginRight: '0.8em' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>Quick Access</div>
            <div style={{ fontSize: '0.75em', opacity: 0.7 }}>
              Show P2PK button in receive menu
            </div>
          </div>
        </label>
      </div>

      {/* Keys List */}
      {p2pkKeys.length > 0 ? (
        <div className="card">
          <h3>Your Keys ({p2pkKeys.length})</h3>
          
          {p2pkKeys.map((key, index) => (
            <div
              key={key.publicKey}
              style={{
                marginBottom: '0.5em',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: expandedKey === key.publicKey ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Key Header */}
              <div
                onClick={() => toggleKeyExpansion(key.publicKey)}
                style={{
                  padding: '0.8em',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.9em', fontWeight: 'bold' }}>
                    Key #{index + 1}
                  </div>
                  <div style={{ 
                    fontSize: '0.75em', 
                    opacity: 0.6, 
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {key.publicKey}
                  </div>
                </div>
                {key.used && (
                  <span style={{
                    fontSize: '0.7em',
                    padding: '0.2em 0.5em',
                    background: 'rgba(255, 165, 0, 0.2)',
                    color: '#FFA500',
                    borderRadius: '4px',
                    marginLeft: '0.5em'
                  }}>
                    USED
                  </span>
                )}
              </div>

              {/* Key Details (Expanded) */}
              {expandedKey === key.publicKey && (
                <div style={{ padding: '0 0.8em 0.8em 0.8em' }}>
                  {/* Used Warning */}
                  {key.used && (
                    <div style={{
                      background: 'rgba(255, 165, 0, 0.1)',
                      border: '1px solid #FFA500',
                      borderRadius: '6px',
                      padding: '0.6em',
                      marginBottom: '1em',
                      fontSize: '0.85em'
                    }}>
                      <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
                      Used {key.usedCount} time(s). Consider generating a new key for better privacy.
                    </div>
                  )}

                  {/* Public Key (Hex) */}
                  <div style={{ marginBottom: '1em' }}>
                    <label style={{ fontSize: '0.75em', opacity: 0.7, display: 'block', marginBottom: '0.3em' }}>
                      Public Key (Cashu Format)
                    </label>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '6px',
                      padding: '0.6em',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.75em',
                      marginBottom: '0.3em'
                    }}>
                      {key.publicKey}
                    </div>
                    <button
                      className="secondary-btn"
                      onClick={() => copyToClipboard(key.publicKey, 'Public key')}
                      style={{ width: '100%', padding: '0.5em', fontSize: '0.85em' }}
                    >
                      <Copy size={14} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
                      Copy Public Key
                    </button>
                  </div>

                  {/* Npub */}
                  <div style={{ marginBottom: '1em' }}>
                    <label style={{ fontSize: '0.75em', opacity: 0.7, display: 'block', marginBottom: '0.3em' }}>
                      Public Key (Nostr Format)
                    </label>
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '6px',
                      padding: '0.6em',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.75em',
                      marginBottom: '0.3em'
                    }}>
                      {getNpub(key.publicKey)}
                    </div>
                    <button
                      className="secondary-btn"
                      onClick={() => copyToClipboard(getNpub(key.publicKey), 'Npub')}
                      style={{ width: '100%', padding: '0.5em', fontSize: '0.85em' }}
                    >
                      <Copy size={14} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
                      Copy Npub
                    </button>
                  </div>

                  {/* Private Key (Nsec) */}
                  <div style={{ marginBottom: '1em' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3em' }}>
                      <label style={{ fontSize: '0.75em', opacity: 0.7 }}>
                        Private Key (Nsec)
                      </label>
                      <button
                        onClick={() => togglePrivateKeyVisibility(key.publicKey)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          padding: '0.3em 0.6em',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.7em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3em'
                        }}
                      >
                        {showPrivateKey[key.publicKey] ? <EyeOff size={12} /> : <Eye size={12} />}
                        {showPrivateKey[key.publicKey] ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    {showPrivateKey[key.publicKey] ? (
                      <>
                        <div style={{
                          background: 'rgba(255, 0, 0, 0.1)',
                          border: '1px solid rgba(255, 0, 0, 0.3)',
                          borderRadius: '6px',
                          padding: '0.6em',
                          wordBreak: 'break-all',
                          fontFamily: 'monospace',
                          fontSize: '0.75em',
                          marginBottom: '0.3em'
                        }}>
                          {getNsec(key.privateKey)}
                        </div>
                        <div style={{
                          fontSize: '0.7em',
                          opacity: 0.7,
                          marginBottom: '0.3em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3em'
                        }}>
                          <AlertTriangle size={12} color="#FF6B6B" />
                          Never share your private key!
                        </div>
                        <button
                          className="secondary-btn"
                          onClick={() => copyToClipboard(getNsec(key.privateKey), 'Private key')}
                          style={{ width: '100%', padding: '0.5em', fontSize: '0.85em' }}
                        >
                          <Copy size={14} style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
                          Copy Private Key
                        </button>
                      </>
                    ) : (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                        padding: '0.8em',
                        textAlign: 'center',
                        fontSize: '0.75em',
                        opacity: 0.6
                      }}>
                        Hidden for security
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    className="cancel-btn"
                    onClick={() => handleDeleteKey(key.publicKey)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em' }}
                  >
                    <Trash2 size={16} />
                    Delete Key
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2em' }}>
          <Key size={48} style={{ opacity: 0.3, marginBottom: '1em' }} />
          <p style={{ opacity: 0.6, marginBottom: '1em' }}>
            No P2PK keys yet
          </p>
          <p style={{ fontSize: '0.85em', opacity: 0.5 }}>
            Generate or import a key to get started
          </p>
        </div>
      )}

      {/* How to Use */}
      <div className="card" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: '#8B5CF6' }}>
        <h3 style={{ color: '#8B5CF6' }}>How to Use</h3>
        <ol style={{ fontSize: '0.9em', lineHeight: '1.6', paddingLeft: '1.5em' }}>
          <li>Generate or import a P2PK key</li>
          <li>Share your <strong>public key or npub</strong> with the sender</li>
          <li>They lock ecash to your key when sending</li>
          <li>You unlock it automatically with your private key</li>
        </ol>
      </div>
    </div>
  )
}

