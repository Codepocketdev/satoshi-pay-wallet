import { useState } from 'react'
import { Cloud, CheckCircle, Loader, AlertCircle } from 'lucide-react'
import { backupMintsToNostr } from '../utils/nostrMintBackup.js'
import { loadSeedPhrase } from '../utils/storage.js'
import { getNostrBackupEnabled, setNostrBackupEnabled } from '../utils/storage.js'

export default function NostrMintBackup({ allMints, seedPhrase, onBack, setSuccess, setError }) {
  const [backing, setBacking] = useState(false)
  const [lastBackup, setLastBackup] = useState(null)
  const [autoBackup, setAutoBackup] = useState(getNostrBackupEnabled())  

  const handleToggleAutoBackup = () => {
    const newValue = !autoBackup
    setAutoBackup(newValue)
    setNostrBackupEnabled(newValue)
    setSuccess(newValue ? 'Auto-backup enabled!' : 'Auto-backup disabled')
    setTimeout(() => setSuccess(''), 2000)
  }

  const handleBackup = async () => {
    try {
      setBacking(true)
      
      const seed = seedPhrase || loadSeedPhrase()
      if (!seed) {
        setError('No seed phrase found')
        return
      }

      const mintUrls = allMints.map(m => m.url)
      
      if (mintUrls.length === 0) {
        setError('No mints to backup')
        return
      }

      const relays = [
        'wss://relay.damus.io',
        'wss://relay.8333.space/',
        'wss://nos.lol',
        'wss://relay.primal.net'
      ]

      await backupMintsToNostr(seed, mintUrls, relays)
      
      setLastBackup(new Date())
      setSuccess('Mints backed up to Nostr successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Backup error:', err)
      setError('Failed to backup: ' + err.message)
      setTimeout(() => setError(''), 3000)
    } finally {
      setBacking(false)
    }
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <Cloud size={24} /> Nostr Backup
        </h1>
      </header>

      <div className="card" style={{
        background: 'rgba(33, 150, 243, 0.1)',
        borderColor: 'rgba(33, 150, 243, 0.3)'
      }}>
        <h3 style={{ color: '#2196F3', marginBottom: '1em' }}>
          ☁️ Nostr Backup
        </h3>
        <p style={{ fontSize: '0.9em', lineHeight: '1.6', marginBottom: '1em' }}>
          Back up your mint list to Nostr relays. You can restore it on any device using your recovery phrase.
        </p>
        
        <div style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '1em' }}>
          <strong>Mints to backup:</strong> {allMints.length}
        </div>

        {lastBackup && (
          <div style={{
            padding: '0.8em',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '8px',
            marginBottom: '1em',
            fontSize: '0.85em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em'
          }}>
            <CheckCircle size={16} color="#4CAF50" />
            <span>Last backup: {lastBackup.toLocaleString()}</span>
          </div>
        )}

  {/* Auto-backup toggle */}
        <div style={{
          padding: '1em',
          background: 'rgba(33, 150, 243, 0.1)',
          borderRadius: '8px',
          marginBottom: '1em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '0.3em' }}>
              Auto-backup
            </div>
            <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
              Backup automatically when mints change
            </div>
          </div>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '50px',
            height: '28px'
          }}>
            <input
              type="checkbox"
              checked={autoBackup}
              onChange={handleToggleAutoBackup}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: autoBackup ? '#2196F3' : '#ccc',
              transition: '0.4s',
              borderRadius: '28px'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '20px',
                width: '20px',
                left: autoBackup ? '26px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%'
              }} />
            </span>
          </label>
        </div>

        <button
          className="primary-btn"
          onClick={handleBackup}
          disabled={backing || allMints.length === 0}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em'
          }}
        >
          {backing ? (
            <>
              <Loader size={16} className="spin" />
              Backing up...
            </>
          ) : (
            <>
              <Cloud size={16} />
              Backup to Nostr
            </>
          )}
        </button>
      </div>

      <div className="card" style={{
        background: 'rgba(255, 152, 0, 0.05)',
        borderColor: 'rgba(255, 152, 0, 0.3)'
      }}>
        <h4 style={{ color: '#FF9800', marginBottom: '0.8em', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <AlertCircle size={18} />
          How it works
        </h4>
        <ul style={{ fontSize: '0.85em', lineHeight: '1.8', paddingLeft: '1.2em', margin: 0, opacity: 0.8 }}>
          <li>Your mint list is encrypted with NIP-44</li>
          <li>Published to public Nostr relays</li>
          <li>Only you can decrypt it with your seed phrase</li>
          <li>Restore on any device by entering your seed</li>
        </ul>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '0.8em' }}>Current Mints</h4>
        {allMints.map(mint => (
          <div key={mint.url} style={{
            padding: '0.8em',
            marginBottom: '0.5em',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.3em' }}>{mint.name}</div>
            <div style={{ fontSize: '0.75em', opacity: 0.6, wordBreak: 'break-all' }}>{mint.url}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
