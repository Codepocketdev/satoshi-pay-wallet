import { useState } from 'react'
import { RotateCcw, FileText, Lightbulb, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { vibrate } from '../utils/cashu.js'
import { searchMintsOnNostr } from '../utils/nostrMintBackup.js'
import { Cloud } from 'lucide-react'

export default function RestoreWallet({ onRestore, onCancel, allMints, onReceiveToken, onAddMint }) {
  const [step, setStep] = useState(1) // 1: seed, 2: select mints, 3: restore
  const [seedInput, setSeedInput] = useState('')
  const [selectedMints, setSelectedMints] = useState([])
  const [autoAdd, setAutoAdd] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState({})
  const [totalRestored, setTotalRestored] = useState(0)
  const [restoredProofs, setRestoredProofs] = useState(0)
  const [restoredTokens, setRestoredTokens] = useState([]) // Store restored tokens
  const [nostrMints, setNostrMints] = useState([])
  const [searchingNostr, setSearchingNostr] = useState(false)
  const [nostrError, setNostrError] = useState('')
 
  const handleSeedSubmit = () => {
    try {
      setError('')
      const cleanSeed = seedInput.trim().toLowerCase().replace(/\s+/g, ' ')
      const words = cleanSeed.split(' ')

      if (words.length !== 12 && words.length !== 24) {
        throw new Error('Recovery phrase must be 12 or 24 words.')
      }

      // Pre-select all mints
      setSelectedMints(allMints.map(m => m.url))
      setStep(2)
      vibrate([50])
    } catch (err) {
      setError(err.message)
      vibrate([200])
    }
  }

  const handleSearchNostr = async () => {
  try {
    setSearchingNostr(true)
    setNostrError('')

    const cleanSeed = seedInput.trim().toLowerCase().replace(/\s+/g, ' ')

    const relays = [
      'wss://relay.damus.io',
      'wss://relay.8333.space/',
      'wss://nos.lol',
      'wss://relay.primal.net'
    ]

    const discovered = await searchMintsOnNostr(cleanSeed, relays)

    setNostrMints(discovered)

    // Auto-select ALL discovered mints
    const allNostrUrls = discovered.map(nm => nm.url)
    setSelectedMints(prev => [...new Set([...prev, ...allNostrUrls])])

    vibrate([100, 50, 100])
  } catch (err) {
    setNostrError(`ERROR: ${err.message}`)
    vibrate([200])
  } finally {
    setSearchingNostr(false)
  }
}

  const toggleMint = (mintUrl) => {
    if (selectedMints.includes(mintUrl)) {
      setSelectedMints(selectedMints.filter(url => url !== mintUrl))
    } else {
      setSelectedMints([...selectedMints, mintUrl])
    }
    vibrate([30])
  }

  const handleStartRestore = async () => {
    try {
      setLoading(true)
      setError('')
      setStep(3)

      // Add any new Nostr-discovered mints before restoring
      const newNostrMints = nostrMints.filter(
        nm => selectedMints.includes(nm.url) && !allMints.find(m => m.url === nm.url)
      )
      for (const mint of newNostrMints) {
        try {
          const mintName = mint.url.replace(/^https?:\/\//, '').replace(/\/.*/,'')
          await onAddMint(mintName, mint.url)
        } catch (err) {
          console.error('Failed to add mint:', err)
        }
      }
      // Wait for allMints state to update after adding
      if (newNostrMints.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      const cleanSeed = seedInput.trim().toLowerCase().replace(/\s+/g, ' ')

      // Call restore with selected mints, autoAdd setting, and progress callback
      await onRestore(cleanSeed, selectedMints, autoAdd, (mintUrl, status, data) => {
        // Handle token completion callback
        if (mintUrl === '__TOKENS__' && status === 'complete') {
          setRestoredTokens(data.tokens)
          
          // Auto-receive if toggle is ON
          if (data.autoAdd && onReceiveToken) {
            ;(async () => {
              for (const tokenObj of data.tokens) {
                try {
                  await onReceiveToken(tokenObj.token)
                  console.log(`✅ Auto-received ${tokenObj.amount} sats`)
                } catch (err) {
                  console.error('Auto-receive failed:', err)
                  setError(`Failed to auto-receive: ${err.message}`)
                }
              }
            })()
          }
          
          return
        }

        setRestoreProgress(prev => ({
          ...prev,
          [mintUrl]: { status, ...data }
        }))

        if (data.totalSats) {
          setTotalRestored(prev => prev + data.totalSats)
          setRestoredProofs(prev => prev + data.proofCount)
        }
      })

      vibrate([100, 50, 100])
    } catch (err) {
      setError(err.message)
      vibrate([200])
    } finally {
      setLoading(false)
    }
  }

  const handleReceiveToken = async (token) => {
    try {
      setLoading(true)
      // Call parent's receive handler
      if (onReceiveToken) {
        await onReceiveToken(token)
      }
      // Remove this token from the list
      setRestoredTokens(prev => prev.filter(t => t.token !== token))
      // Update totals
      const tokenObj = restoredTokens.find(t => t.token === token)
      if (tokenObj) {
        setTotalRestored(prev => prev - tokenObj.amount)
        setRestoredProofs(prev => prev - tokenObj.proofCount)
      }
      setLoading(false)
    } catch (err) {
      setError('Failed to receive token: ' + err.message)
      setLoading(false)
    }
  }

  const handleCopyToken = async (tokenString) => {
    try {
      await navigator.clipboard.writeText(tokenString)
      alert('Token copied!')
    } catch (err) {
      setError('Failed to copy token')
    }
  }

  // STEP 1: Enter Seed
  if (step === 1) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={onCancel}>Cancel</button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <RotateCcw size={24} /> Restore Wallet
          </h1>
        </header>

        {/* Warning Card */}
        <div className="card" style={{
          background: 'rgba(255, 152, 0, 0.05)',
          borderColor: 'rgba(255, 152, 0, 0.4)',
          borderWidth: '2px',
          borderStyle: 'solid',
          marginBottom: '1em'
        }}>
          <h4 style={{
            color: '#FF9800',
            fontSize: '1em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em',
            marginBottom: '0.8em'
          }}>
            <AlertCircle size={20} /> Before You Restore
          </h4>
          <p style={{ fontSize: '0.9em', lineHeight: '1.6', marginBottom: '0.8em' }}>
            Make sure you have <strong>added all the mints</strong> you used before in Settings → Mints.
          </p>
          <p style={{ fontSize: '0.9em', lineHeight: '1.6' }}>
            The restore wizard can only recover ecash from mints that are already added to your wallet.
          </p>
        </div>

        <div className="card">
          <h3>Step 1: Enter Recovery Phrase</h3>
          <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
            Enter your 12 or 24-word recovery phrase:
          </p>

          {error && (
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              color: '#ff6b6b',
              padding: '0.8em',
              borderRadius: '8px',
              marginBottom: '1em',
              fontSize: '0.9em',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5em'
            }}>
              <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ position: 'relative', marginBottom: '1em' }}>
            <textarea
              placeholder="Enter your 12 or 24 recovery words separated by spaces"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              rows={4}
              autoFocus
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
                  const cleaned = text.trim().toLowerCase().replace(/\s+/g, ' ')
                  setSeedInput(cleaned)
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
            onClick={handleSeedSubmit}
            disabled={!seedInput.trim()}
          >
            Next: Select Mints
          </button>
        </div>

        <div className="card" style={{ borderColor: 'rgba(255, 215, 0, 0.3)' }}>
          <h4 style={{
            color: '#FFD700',
            fontSize: '0.95em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em',
            marginBottom: '0.8em'
          }}>
            <Lightbulb size={16} /> Tips
          </h4>
          <ul style={{ fontSize: '0.85em', lineHeight: '1.6', paddingLeft: '1.2em', opacity: 0.8, margin: 0 }}>
            <li>Must be exactly 12 or 24 words</li>
            <li>Separated by single spaces</li>
            <li>All lowercase letters</li>
            <li>Make sure all your mints are added first!</li>
          </ul>
        </div>
      </div>
    )
  }

  // STEP 2: Select Mints
  if (step === 2) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <RotateCcw size={24} /> Restore Wallet
          </h1>
        </header>

        <div className="card">
          <h3>Step 2: Select Mints</h3>
          <p style={{ fontSize: '0.9em', marginBottom: '1em', opacity: 0.8 }}>
            Select which mints to restore from. By default, all mints are selected.
          </p>

   {/* Nostr Search Button */}
        <button
          className="secondary-btn"
          onClick={handleSearchNostr}
          disabled={searchingNostr}
          style={{
            marginBottom: '1em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
            width: '100%'
          }}
        >
          {searchingNostr ? (
            <>
              <Loader size={16} className="spin" />
              Searching Nostr...
            </>
          ) : (
            <>
              <Cloud size={16} />
              Search Nostr for Backed-up Mints
            </>
          )}
        </button>

        {nostrError && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            color: '#ff6b6b',
            padding: '0.8em',
            borderRadius: '8px',
            marginBottom: '1em',
            fontSize: '0.9em'
          }}>
            {nostrError}
          </div>
        )}

        {nostrMints.length > 0 && (
          <div className="card" style={{
            background: 'rgba(33, 150, 243, 0.1)',
            borderColor: 'rgba(33, 150, 243, 0.3)',
            marginBottom: '1em'
          }}>
            <h4 style={{ color: '#2196F3', marginBottom: '0.5em' }}>
              Found {nostrMints.length} mint{nostrMints.length !== 1 ? 's' : ''} from Nostr backup
            </h4>
            {nostrMints.map(nm => {
              const alreadyAdded = allMints.find(m => m.url === nm.url)
              const isSelected = selectedMints.includes(nm.url)
              return (
                <div
                  key={nm.url}
                  onClick={() => !alreadyAdded && toggleMint(nm.url)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8em',
                    padding: '0.8em',
                    marginBottom: '0.4em',
                    borderRadius: '8px',
                    cursor: alreadyAdded ? 'default' : 'pointer',
                    border: alreadyAdded
                      ? '1px solid rgba(76, 175, 80, 0.3)'
                      : isSelected
                        ? '2px solid #3B82F6'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    background: alreadyAdded
                      ? 'rgba(76, 175, 80, 0.1)'
                      : isSelected
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '4px',
                    border: '2px solid',
                    borderColor: alreadyAdded ? '#4CAF50' : isSelected ? '#3B82F6' : 'rgba(255,255,255,0.3)',
                    background: alreadyAdded ? '#4CAF50' : isSelected ? '#3B82F6' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {(alreadyAdded || isSelected) && <CheckCircle size={14} color="white" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>{nm.url}</div>
                    {alreadyAdded && (
                      <div style={{ fontSize: '0.75em', color: '#4CAF50', marginTop: '0.2em' }}>
                        ✅ Already in wallet
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

          {allMints.length === 0 && (
            <div style={{
              background: 'rgba(255, 152, 0, 0.1)',
              color: '#FF9800',
              padding: '1em',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '1em'
            }}>
              <AlertCircle size={24} style={{ marginBottom: '0.5em' }} />
              <p>No mints added yet!</p>
              <p style={{ fontSize: '0.85em', marginTop: '0.5em' }}>
                Add mints in Settings before restoring.
              </p>
            </div>
          )}

          <div style={{ marginBottom: '1.5em' }}>
            {allMints.map(mint => (
              <div
                key={mint.url}
                onClick={() => toggleMint(mint.url)}
                className="card"
                style={{
                  padding: '1em',
                  marginBottom: '0.5em',
                  cursor: 'pointer',
                  border: selectedMints.includes(mint.url)
                    ? '2px solid #3B82F6'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedMints.includes(mint.url)
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8em'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: '2px solid',
                    borderColor: selectedMints.includes(mint.url) ? '#3B82F6' : 'rgba(255, 255, 255, 0.3)',
                    background: selectedMints.includes(mint.url) ? '#3B82F6' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {selectedMints.includes(mint.url) && (
                      <CheckCircle size={16} color="white" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.2em' }}>
                      {mint.name}
                    </div>
                    <div style={{ fontSize: '0.75em', opacity: 0.6, wordBreak: 'break-all' }}>
                      {mint.url}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Toggle */}
          <div className="card" style={{
            background: 'rgba(76, 175, 80, 0.05)',
            borderColor: 'rgba(76, 175, 80, 0.3)',
            marginBottom: '1em'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{ margin: 0, marginBottom: '0.3em', color: '#4CAF50' }}>
                  Auto-add to Wallet
                </h4>
                <p style={{ fontSize: '0.85em', opacity: 0.7, margin: 0 }}>
                  Automatically add restored tokens to your balance
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autoAdd}
                  onChange={(e) => setAutoAdd(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handleStartRestore}
            disabled={selectedMints.length === 0}
            style={{ marginBottom: '0.5em' }}
          >
            Restore from {selectedMints.length} Mint{selectedMints.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  // STEP 3: Restore Progress
  if (step === 3) {
    const allDone = Object.values(restoreProgress).every(p => p.status === 'done' || p.status === 'error')

    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={onCancel} disabled={loading}>
            {allDone ? 'Close' : 'Cancel'}
          </button>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <RotateCcw size={24} /> Restoring...
          </h1>
        </header>

        {/* Summary Card */}
        <div className="card" style={{
          background: totalRestored > 0 ? 'rgba(81, 207, 102, 0.1)' : 'rgba(33, 150, 243, 0.1)',
          borderColor: totalRestored > 0 ? 'rgba(81, 207, 102, 0.3)' : 'rgba(33, 150, 243, 0.3)',
          borderWidth: '2px',
          borderStyle: 'solid',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '2em', color: totalRestored > 0 ? '#51CF66' : '#2196F3' }}>
            {totalRestored} sats
          </h2>
          <p style={{ margin: '0.5em 0 0 0', opacity: 0.8 }}>
            {restoredProofs} proofs restored
          </p>
        </div>

        {/* Per-Mint Progress */}
        <div className="card">
          <h3>Restore Progress</h3>

          {allMints
            .filter(mint => selectedMints.includes(mint.url))
            .map(mint => {
              const progress = restoreProgress[mint.url] || { status: 'pending' }

              return (
                <div
                  key={mint.url}
                  style={{
                    padding: '0.8em',
                    marginBottom: '0.5em',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5em' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{mint.name}</span>
                    {progress.status === 'scanning' && <Loader size={16} className="spin" />}
                    {progress.status === 'done' && <CheckCircle size={16} color="#51CF66" />}
                    {progress.status === 'error' && <AlertCircle size={16} color="#ff6b6b" />}
                  </div>

                  {progress.message && (
                    <div style={{ fontSize: '0.8em', opacity: 0.7 }}>
                      {progress.message}
                    </div>
                  )}

                  {progress.totalSats > 0 && (
                    <div style={{ fontSize: '0.85em', color: '#51CF66', marginTop: '0.3em' }}>
                      ✅ Restored {progress.totalSats} sats ({progress.proofCount} proofs)
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {/* No tokens found */}
        {allDone && totalRestored === 0 && (
          <div className="card" style={{
            background: 'rgba(255, 152, 0, 0.1)',
            borderColor: 'rgba(255, 152, 0, 0.3)',
            textAlign: 'center'
          }}>
            <AlertCircle size={48} color="#FF9800" style={{ marginBottom: '0.5em' }} />
            <h3 style={{ color: '#FF9800' }}>No tokens found</h3>
            <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
              No unspent tokens were found on the selected mints.
            </p>
          </div>
        )}

        {/* Manual Claim Section when autoAdd=false */}
        {allDone && totalRestored > 0 && !autoAdd && (
          <div className="card" style={{
            background: 'rgba(255, 165, 0, 0.05)',
            borderColor: 'rgba(255, 165, 0, 0.3)'
          }}>
            <h3 style={{ color: '#FFA500', marginBottom: '1em' }}>
              Restored Tokens ({restoredTokens.length})
            </h3>
            {restoredTokens.map((tokenObj, idx) => (
              <div key={idx} style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '1em',
                borderRadius: '8px',
                marginBottom: '0.5em'
              }}>
                <div style={{ fontWeight: 'bold', color: '#FFA500', marginBottom: '0.5em' }}>
                  {tokenObj.amount} sats from {tokenObj.mintName}
                </div>
                <div style={{ display: 'flex', gap: '0.5em' }}>
                  <button
                    className="secondary-btn"
                    onClick={() => handleCopyToken(tokenObj.token)}
                    style={{ flex: 1 }}
                  >
                    Copy
                  </button>
                  <button
                    className="primary-btn"
                    onClick={() => handleReceiveToken(tokenObj.token)}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    Receive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Success message when autoAdd=true */}
        {allDone && totalRestored > 0 && autoAdd && (
          <div className="card" style={{
            background: 'rgba(76, 175, 80, 0.05)',
            borderColor: 'rgba(76, 175, 80, 0.3)',
            textAlign: 'center'
          }}>
            <CheckCircle size={48} color="#4CAF50" style={{ marginBottom: '0.5em' }} />
            <h3 style={{ color: '#4CAF50' }}>Tokens Added!</h3>
            <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
              {totalRestored} sats have been added to your wallet.
            </p>
          </div>
        )}
      </div>
    )
  }
}
