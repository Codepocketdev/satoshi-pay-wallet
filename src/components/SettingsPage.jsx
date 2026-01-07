import { useState } from 'react'
import { DEFAULT_MINTS } from '../utils/cashu.js'
import { generateWalletSeed } from '../utils/cashu.js'
import NostrSettings from './NostrSettings.jsx'

export default function SettingsPage({
  allMints,
  mintUrl,
  balances,
  currentMintBalance,
  onMintSwitch,
  onAddMint,
  onRemoveMint,
  onResetMint,
  onShowSeedBackup,
  onShowRestoreWallet,
  onClose,
  seedPhrase,
  setSeedPhrase
}) {
  const [showAddMint, setShowAddMint] = useState(false)
  const [newMintName, setNewMintName] = useState('')
  const [newMintUrl, setNewMintUrl] = useState('')
  const [showNostrSettings, setShowNostrSettings] = useState(false)

  const handleAddMint = () => {
    const success = onAddMint(newMintName, newMintUrl)
    if (success) {
      setNewMintName('')
      setNewMintUrl('')
      setShowAddMint(false)
    }
  }

  // Render Nostr settings
  if (showNostrSettings) {
    return (
      <NostrSettings
        onClose={() => setShowNostrSettings(false)}
      />
    )
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h1>⚙️ Settings</h1>
      </header>

      {/* Backup & Restore Section */}
      <div className="card" style={{ borderColor: '#FFD700' }}>
        <h3 style={{ color: '#FFD700' }}>🔐 Wallet Backup</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
          Protect your wallet with a 12-word recovery phrase
        </p>

        <button
          className="primary-btn"
          onClick={onShowSeedBackup}
        >
          📝 View Recovery Phrase
        </button>

        <button
          className="secondary-btn"
          onClick={onShowRestoreWallet}
        >
          🔄 Restore from Backup
        </button>

        <div style={{
          marginTop: '1em',
          padding: '0.8em',
          background: 'rgba(255, 215, 0, 0.1)',
          borderRadius: '8px',
          fontSize: '0.85em',
          lineHeight: '1.5'
        }}>
          💡 <strong>Tip:</strong> Write down your recovery phrase on paper and store it safely. Never share it with anyone!
        </div>
      </div>

      {/* Nostr Integration Section */}
      <div className="card" style={{ borderColor: '#8B5CF6' }}>
        <h3 style={{ color: '#8B5CF6' }}>🟣 Advanced Features</h3>

        <button
          className="settings-btn"
          onClick={() => setShowNostrSettings(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
            borderColor: '#8B5CF6',
            display: 'flex',
            alignItems: 'center',
            gap: '1em',
            padding: '1em'
          }}
        >
          <span style={{ fontSize: '1.5em' }}>🟣</span>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>Nostr Integration</div>
            <div style={{ fontSize: '0.75em', opacity: 0.8 }}>Send/receive ecash via Nostr DMs</div>
          </div>
        </button>
      </div>

      {/* Mint Selection */}
      <div className="card">
        <h3>Select Mint</h3>
        <p style={{ fontSize: '0.85em', marginBottom: '1em', opacity: 0.7 }}>
          Current: {allMints.find(m => m.url === mintUrl)?.name || 'Unknown'}
        </p>

        {allMints.map(mint => (
          <div key={mint.url} className="mint-item">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{mint.name}</div>
              <div style={{ fontSize: '0.8em', opacity: 0.6, wordBreak: 'break-all' }}>{mint.url}</div>
              <div style={{ fontSize: '0.9em', marginTop: '0.3em', color: '#FF8C00' }}>
                {balances[mint.url] || 0} sats
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5em', alignItems: 'center' }}>
              {mintUrl === mint.url ? (
                <span style={{ color: '#51cf66', fontSize: '0.9em' }}>✓ Active</span>
              ) : (
                <button
                  className="secondary-btn"
                  style={{ padding: '0.4em 0.8em', fontSize: '0.85em', width: 'auto' }}
                  onClick={() => onMintSwitch(mint.url)}
                >
                  Switch
                </button>
              )}
              {!DEFAULT_MINTS.find(m => m.url === mint.url) && (
                <button
                  className="cancel-btn"
                  style={{ padding: '0.4em 0.8em', fontSize: '0.85em', width: 'auto' }}
                  onClick={() => onRemoveMint(mint.url)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}

        <button className="primary-btn" onClick={() => setShowAddMint(true)} style={{ marginTop: '1em' }}>
          + Add Mint
        </button>
      </div>

      {/* Add Mint Form */}
      {showAddMint && (
        <div className="card">
          <h3>Add New Mint</h3>
          <input
            type="text"
            placeholder="Mint name (e.g., My Mint)"
            value={newMintName}
            onChange={(e) => setNewMintName(e.target.value)}
            style={{ marginBottom: '0.5em' }}
          />
          <input
            type="text"
            placeholder="Mint URL (https://...)"
            value={newMintUrl}
            onChange={(e) => setNewMintUrl(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5em', marginTop: '0.5em' }}>
            <button className="secondary-btn" onClick={() => setShowAddMint(false)}>Cancel</button>
            <button className="primary-btn" onClick={handleAddMint}>Add</button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: '#ff6b6b' }}>
        <h3 style={{ color: '#ff6b6b' }}>⚠️ Danger Zone</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
          Reset the current mint if you have corrupted tokens.
        </p>
        <button
          className="cancel-btn"
          onClick={onResetMint}
          style={{ width: '100%' }}
        >
          Reset Current Mint ({currentMintBalance} sats)
        </button>
      </div>
    </div>
  )
}
