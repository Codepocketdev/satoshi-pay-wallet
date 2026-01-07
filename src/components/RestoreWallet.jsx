import { useState } from 'react'
import { RotateCcw, FileText, Lightbulb } from 'lucide-react'
import { vibrate } from '../utils/cashu.js'

export default function RestoreWallet({ onRestore, onCancel }) {
  const [seedInput, setSeedInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRestore = async () => {
    try {
      setLoading(true)
      setError('')

      const cleanSeed = seedInput.trim().toLowerCase().replace(/\s+/g, ' ')
      const words = cleanSeed.split(' ')
      
      if (words.length < 12) {
        throw new Error('Recovery phrase must be at least 12 words.')
      }

      await onRestore(cleanSeed)
      vibrate([100, 50, 100])

    } catch (err) {
      setError(err.message)
      vibrate([200])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onCancel}>← Cancel</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <RotateCcw size={24} /> Restore Wallet
        </h1>
      </header>

      <div className="card">
        <h3>Enter Recovery Phrase</h3>
        <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
          Enter your 12-word recovery phrase to restore your wallet:
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            color: '#ff6b6b',
            padding: '0.8em',
            borderRadius: '8px',
            marginBottom: '1em',
            fontSize: '0.9em'
          }}>
            {error}
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: '1em' }}>
          <textarea
            placeholder="Enter your 12 recovery words separated by spaces"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '0.8em',
              paddingRight: '3.5em',
              fontSize: '0.9em',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'white',
              resize: 'vertical'
            }}
          />
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText()
                setSeedInput(text.trim())
                vibrate([50])
              } catch (err) {
                setError('Failed to paste from clipboard')
              }
            }}
            style={{
              position: 'absolute',
              right: '8px',
              top: '8px',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '6px',
              color: '#FFD700',
              padding: '0.5em 0.8em',
              fontSize: '0.85em',
              cursor: 'pointer'
            }}
          >
            <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Paste
          </button>
        </div>

        <button
          className="primary-btn"
          onClick={handleRestore}
          disabled={loading || !seedInput.trim()}
        >
          {loading ? 'Restoring...' : 'Restore Wallet'}
        </button>
      </div>

      <div className="card" style={{ borderColor: 'rgba(255, 215, 0, 0.3)' }}>
        <h4 style={{ color: '#FFD700', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <Lightbulb size={16} /> Tips:
        </h4>
        <ul style={{ fontSize: '0.85em', lineHeight: '1.6', paddingLeft: '1.2em', opacity: 0.8 }}>
          <li>Must be exactly 12 words</li>
          <li>Separated by spaces</li>
          <li>All lowercase</li>
          <li>Check for typos carefully</li>
        </ul>
      </div>
    </div>
  )
}
