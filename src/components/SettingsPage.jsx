import { useState } from 'react'
import { Settings, Lock, RefreshCw, Lightbulb, AlertTriangle, CheckCircle, FileText, RotateCcw, ArrowDownUp, Key } from 'lucide-react'
import { DEFAULT_MINTS } from '../utils/cashu.js'
import { generateWalletSeed } from '../utils/cashu.js'
import { loadSeedPhrase, saveSeedPhrase } from '../utils/storage.js'
import { CURRENCIES, getSelectedCurrency, setSelectedCurrency } from '../utils/price.js'
import NostrSettings from './NostrSettings.jsx'
import P2PKSettings from './P2PKSettings.jsx'
import MintSwap from './MintSwap.jsx'

export default function SettingsPage({
  allMints,
  customMints,
  mintUrl,
  balances,
  currentMintBalance,
  setMintUrl,
  addCustomMint,
  removeCustomMint,
  resetMint,
  onShowSeedBackup,
  onShowRestoreWallet,
  onBack,
  setSuccess,
  wallet,
  masterKey,
  bip39Seed,  
  getProofs,
  saveProofs,
  addTransaction,
  setError,
  onMintSwitch,
  onAddMint,
  onRemoveMint,
  onResetMint,
  onClose,
  seedPhrase,
  setSeedPhrase
}) {
  const [showAddMint, setShowAddMint] = useState(false)
  const [newMintName, setNewMintName] = useState('')
  const [newMintUrl, setNewMintUrl] = useState('')
  const [showNostrSettings, setShowNostrSettings] = useState(false)
  const [showP2PKSettings, setShowP2PKSettings] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  const [selectedCurr, setSelectedCurr] = useState(getSelectedCurrency())

  const handleAddMint = () => {
    const addMintFn = addCustomMint || onAddMint
    const success = addMintFn(newMintName, newMintUrl)
    if (success) {
      setNewMintName('')
      setNewMintUrl('')
      setShowAddMint(false)
    }
  }

  const handleMintSwitch = (url) => {
    if (setMintUrl) {
      setMintUrl(url)
    } else if (onMintSwitch) {
      onMintSwitch(url)
    }
  }

  const handleRemoveMint = (url) => {
    if (removeCustomMint) {
      removeCustomMint(url)
    } else if (onRemoveMint) {
      onRemoveMint(url)
    }
  }

  const handleResetMint = () => {
    const mintName = allMints.find(m => m.url === mintUrl)?.name || 'this mint'
    
    if (confirm(`Reset ${mintName}?\n\nThis will clear ${currentMintBalance} sats from this mint.\n\nThis cannot be undone!`)) {
      if (resetMint) {
        resetMint()
        setSuccess && setSuccess(`${mintName} reset!`)
        setTimeout(() => setSuccess && setSuccess(''), 3000)
      } else if (onResetMint) {
        onResetMint()
      }
    }
  }

  const handleViewRecoveryPhrase = () => {
    const currentSeed = loadSeedPhrase()
    if (!currentSeed || currentSeed.trim() === "") {
      const newSeed = generateWalletSeed()
      saveSeedPhrase(newSeed)
    }
    onShowSeedBackup()
  }

  const handleClose = () => {
    if (onBack) {
      onBack()
    } else if (onClose) {
      onClose()
    }
  }

  const handleCurrencyChange = (currency) => {
    setSelectedCurrency(currency)
    setSelectedCurr(currency)
    setSuccess && setSuccess(`Currency changed to ${currency}`)
    setTimeout(() => setSuccess && setSuccess(''), 2000)
  }

  // P2PK Settings page
  if (showP2PKSettings) {
    return (
      <P2PKSettings
        onClose={() => setShowP2PKSettings(false)}
        setSuccess={setSuccess}
        setError={setError}
      />
    )
  }

  if (showNostrSettings) {
    return (
      <NostrSettings
        onClose={() => setShowNostrSettings(false)}
      />
    )
  }

  if (showSwap) {
    return (
      <MintSwap
        allMints={allMints}
        balances={balances}
        wallet={wallet}
        masterKey={masterKey}
        bip39Seed={bip39Seed}  
        getProofs={getProofs}
        saveProofs={saveProofs}
        addTransaction={addTransaction}
        onBack={() => setShowSwap(false)}
        setError={setError}
        setSuccess={setSuccess}
      />
    )
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={handleClose}>← Back</button>
        <h1>Settings</h1>
      </header>

      <div className="card" style={{ borderColor: '#FFD700' }}>
        <h3 style={{ color: '#FFD700', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <Lock size={20} /> Wallet Backup
        </h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
          Protect your wallet with a 12-word recovery phrase
        </p>

        <button
          className="primary-btn"
          onClick={handleViewRecoveryPhrase}
        >
          <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> View Recovery Phrase
        </button>

        <button
          className="secondary-btn"
          onClick={onShowRestoreWallet}
        >
          <RotateCcw size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Restore from Backup
        </button>

        <div style={{
          marginTop: '1em',
          padding: '0.8em',
          background: 'rgba(255, 215, 0, 0.1)',
          borderRadius: '8px',
          fontSize: '0.85em',
          lineHeight: '1.5'
        }}>
          <Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> <strong>Tip:</strong> Write down your recovery phrase on paper and store it safely. Never share it with anyone!
        </div>
      </div>

      <div className="card" style={{ borderColor: '#FF8C00' }}>
        <h3 style={{ color: '#FF8C00' }}>Currency Display</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
          Choose your preferred currency for balance display
        </p>

        <label style={{ 
          display: 'block', 
          fontSize: '0.85em', 
          opacity: 0.7, 
          marginBottom: '0.5em' 
        }}>
          Select Currency
        </label>
        <select
          value={selectedCurr}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8em',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            fontSize: '1em',
            marginBottom: '0.5em'
          }}
        >
          {Object.entries(CURRENCIES).map(([code, info]) => (
            <option key={code} value={code}>
              {info.symbol} {info.name} ({code})
            </option>
          ))}
        </select>

        <div style={{
          marginTop: '1em',
          padding: '0.8em',
          background: 'rgba(255, 140, 0, 0.1)',
          borderRadius: '8px',
          fontSize: '0.85em',
          lineHeight: '1.5'
        }}>
          <Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Tap the small text below your balance on the home screen to switch between sats and fiat display
        </div>
      </div>

      <div className="card" style={{ borderColor: '#8B5CF6' }}>
        <h3 style={{ color: '#8B5CF6' }}>Advanced Features</h3>

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
            padding: '1em',
            marginBottom: '0.5em'
          }}
        >
          <span style={{ fontSize: '1.5em' }}>🟣</span>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>Nostr Integration</div>
            <div style={{ fontSize: '0.75em', opacity: 0.8 }}>Send/receive ecash via Nostr DMs</div>
          </div>
        </button>

        <button
          className="settings-btn"
          onClick={() => setShowP2PKSettings(true)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
            borderColor: '#A855F7',
            display: 'flex',
            alignItems: 'center',
            gap: '1em',
            padding: '1em'
          }}
        >
          <Key size={24} />
          <div style={{ textAlign: 'left', flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>P2PK Keys</div>
            <div style={{ fontSize: '0.75em', opacity: 0.8 }}>Secure payments with locked ecash</div>
          </div>
        </button>
      </div>

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
                <span style={{ color: '#51cf66', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '0.3em' }}>
                  <CheckCircle size={14} /> Active
                </span>
              ) : (
                <button
                  className="secondary-btn"
                  style={{ padding: '0.4em 0.8em', fontSize: '0.85em', width: 'auto' }}
                  onClick={() => handleMintSwitch(mint.url)}
                >
                  Switch
                </button>
              )}
              {!DEFAULT_MINTS.find(m => m.url === mint.url) && (
                <button
                  className="cancel-btn"
                  style={{ padding: '0.4em 0.8em', fontSize: '0.85em', width: 'auto' }}
                  onClick={() => handleRemoveMint(mint.url)}
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

        <button 
          className="secondary-btn" 
          onClick={() => setShowSwap(true)} 
          style={{ 
            marginTop: '0.5em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
            width: '100%'
          }}
        >
          <ArrowDownUp size={18} />
          Swap Between Mints
        </button>
      </div>

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

      <div className="card" style={{ borderColor: '#ff6b6b' }}>
        <h3 style={{ color: '#ff6b6b' }}>Danger Zone</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
          Reset the current mint if you have corrupted tokens.
        </p>
        <button
          className="cancel-btn"
          onClick={handleResetMint}
          style={{ width: '100%' }}
        >
          Reset Current Mint ({currentMintBalance} sats)
        </button>
      </div>
    </div>
  )
}

