import { useState } from 'react'
import { Lock, X, Check, Copy, AlertTriangle } from 'lucide-react'
import { vibrate } from '../utils/cashu.js'

export default function SeedPhraseBackup({ seedPhrase, onConfirm, onCancel, isNewWallet }) {
  const [confirmed, setConfirmed] = useState(false)
  const [userWords, setUserWords] = useState(Array(12).fill(''))
  const [verifyMode, setVerifyMode] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  if (!seedPhrase || seedPhrase.trim() === '') {
    return (
      <div className="app">
        <div className="card">
          <p style={{ textAlign: 'center' }}>Generating seed phrase...</p>
        </div>
      </div>
    )
  }

  const words = seedPhrase.split(' ')

  if (words.length !== 12) {
    return (
      <div className="app">
        <div className="card" style={{ borderColor: '#ff6b6b' }}>
          <h3 style={{ color: '#ff6b6b' }}>⚠️ Error</h3>
          <p>Invalid seed phrase (expected 12 words, got {words.length})</p>
        </div>
      </div>
    )
  }

  const handleVerify = () => {
    const userPhrase = userWords.join(' ')
    if (userPhrase === seedPhrase) {
      vibrate([100, 50, 100])
      onConfirm()
    } else {
      setVerifyError('Words do not match! Please try again.')
      vibrate([200, 100, 200])
      setTimeout(() => setVerifyError(''), 3000)
    }
  }

  return (
    <div className="app">
      <header>
        {!isNewWallet && <button className="back-btn" onClick={onCancel}>← Back</button>}
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <Lock size={24} /> {verifyMode ? 'Verify' : 'Backup'} Wallet
        </h1>
      </header>

      {!verifyMode ? (
        <>
          <div className="card" style={{ borderColor: '#ff6b6b' }}>
            <h3 style={{ color: '#ff6b6b' }}>⚠️ CRITICAL: Write This Down!</h3>
            <p style={{ fontSize: '0.9em', lineHeight: '1.6', marginBottom: '1em' }}>
              This is your <strong>recovery phrase</strong>. Write it down on paper and keep it safe.
              <br/><br/>
              <X size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em', color: '#ff6b6b' }} /> <strong>Never share it with anyone</strong><br/>
              <X size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em', color: '#ff6b6b' }} /> <strong>Don't screenshot or save digitally</strong><br/>
              <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em', color: '#51cf66' }} /> <strong>Store it offline and securely</strong>
            </p>
          </div>

          <div className="card">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.8em',
              marginBottom: '1em'
            }}>
              {words.map((word, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  padding: '1em 0.8em',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5em'
                }}>
                  <span style={{ opacity: 0.5, fontSize: '0.75em', minWidth: '20px' }}>
                    {idx + 1}.
                  </span>
                  <strong style={{ fontSize: '1em', color: '#FFD700', flex: 1, wordBreak: 'break-word' }}>
                    {word}
                  </strong>
                </div>
              ))}
            </div>

            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(seedPhrase)
              }}
              style={{ 
                marginTop: '0.5em',
                background: 'rgba(255, 215, 0, 0.1)',
                color: '#FFD700',
                fontSize: '0.9em'
              }}
            >
              <Copy size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Copy to Clipboard (Use carefully!)
            </button>
          </div>

          <div className="card">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5em' }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.95em' }}>
                I have written down my recovery phrase on paper
              </span>
            </label>
          </div>

          <button
            className="primary-btn"
            onClick={() => setVerifyMode(true)}
            disabled={!confirmed}
          >
            Continue to Verification
          </button>

          {!isNewWallet && (
            <button className="secondary-btn" onClick={onCancel} style={{ marginTop: '0.5em' }}>
              Cancel
            </button>
          )}
        </>
      ) : (
        <>
          <div className="card">
            <h3>Verify Your Words</h3>
            <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
              Enter your 12 recovery words to confirm you wrote them down correctly:
            </p>
            {verifyError && (
              <div style={{
                background: 'rgba(255, 107, 107, 0.1)',
                color: '#ff6b6b',
                padding: '0.8em',
                borderRadius: '8px',
                marginBottom: '1em',
                fontSize: '0.9em'
              }}>
                {verifyError}
              </div>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5em',
              marginBottom: '1em'
            }}>
              {userWords.map((word, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`${idx + 1}. word`}
                  value={word}
                  onChange={(e) => {
                    const newWords = [...userWords]
                    newWords[idx] = e.target.value.toLowerCase().trim()
                    setUserWords(newWords)
                  }}
                  style={{
                    padding: '0.6em',
                    fontSize: '0.9em',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                />
              ))}
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handleVerify}
            disabled={userWords.some(w => !w)}
          >
            Verify & Continue
          </button>

          <button
            className="secondary-btn"
            onClick={() => {
              setVerifyMode(false)
              setUserWords(Array(12).fill(''))
              setVerifyError('')
            }}
            style={{ marginTop: '0.5em' }}
          >
            ← Back to Recovery Phrase
          </button>
        </>
      )}
    </div>
  )
}
