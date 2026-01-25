import { useState, useEffect } from 'react'
import { User, Zap, Mail } from 'lucide-react'
import { contactsStore } from '../utils/contactsStore'

export default function ContactEdit({ contactId, onBack, onSave }) {
  const [name, setName] = useState('')
  const [nostrPubkey, setNostrPubkey] = useState('')
  const [lightningAddress, setLightningAddress] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isEdit = contactId !== null

  useEffect(() => {
    if (isEdit) {
      const contact = contactsStore.getContact(contactId)
      if (contact) {
        setName(contact.name)
        setNostrPubkey(contact.nostrPubkey || '')
        setLightningAddress(contact.lightningAddress || '')
        setFavorite(contact.favorite)
      }
    }
  }, [contactId, isEdit])

  const handleSave = () => {
    setError('')

    // Validation
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!nostrPubkey.trim() && !lightningAddress.trim()) {
      setError('At least one contact method (Nostr or Lightning) is required')
      return
    }

    // Validate npub format if provided
    if (nostrPubkey.trim() && !nostrPubkey.startsWith('npub1')) {
      setError('Invalid Nostr public key (must start with npub1)')
      return
    }

    // Validate Lightning Address format if provided
    if (lightningAddress.trim() && !lightningAddress.includes('@')) {
      setError('Invalid Lightning Address (must contain @)')
      return
    }

    const contactData = {
      name: name.trim(),
      nostrPubkey: nostrPubkey.trim() || null,
      lightningAddress: lightningAddress.trim() || null,
      favorite
    }

    if (isEdit) {
      contactsStore.updateContact(contactId, contactData)
    } else {
      contactsStore.addContact(contactData)
    }

    onSave()
  }

  const handleFetchNostrProfile = async () => {
    if (!nostrPubkey.trim() || !nostrPubkey.startsWith('npub1')) {
      setError('Enter a valid npub first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // TODO: Implement Nostr profile fetching
      // For now, just show a message
      setError('Nostr profile fetching coming soon!')
    } catch (err) {
      setError('Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>{isEdit ? 'Edit Contact' : 'Add Contact'}</h1>
      </header>

      <div style={{ padding: '1em' }}>
        <div className="card">
          {/* Name */}
          <div style={{ marginBottom: '1em' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85em',
              opacity: 0.7,
              marginBottom: '0.5em'
            }}>
              <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} />
              Name *
            </label>
            <input
              type="text"
              placeholder="Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8em',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '1em'
              }}
            />
          </div>

          {/* Nostr Pubkey */}
          <div style={{ marginBottom: '1em' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85em',
              opacity: 0.7,
              marginBottom: '0.5em'
            }}>
              <Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} />
              Nostr Public Key (npub)
            </label>
            <input
              type="text"
              placeholder="npub1..."
              value={nostrPubkey}
              onChange={(e) => setNostrPubkey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8em',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '0.85em',
                fontFamily: 'monospace'
              }}
            />
            {nostrPubkey.trim() && (
              <button
                className="secondary-btn"
                onClick={handleFetchNostrProfile}
                disabled={loading}
                style={{
                  marginTop: '0.5em',
                  padding: '0.5em 1em',
                  fontSize: '0.85em'
                }}
              >
                {loading ? 'Fetching...' : 'Fetch Profile Info'}
              </button>
            )}
          </div>

          {/* Lightning Address */}
          <div style={{ marginBottom: '1em' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85em',
              opacity: 0.7,
              marginBottom: '0.5em'
            }}>
              <Zap size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} />
              Lightning Address
            </label>
            <input
              type="text"
              placeholder="alice@getalby.com"
              value={lightningAddress}
              onChange={(e) => setLightningAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8em',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '0.85em',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* Favorite Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em',
            marginBottom: '1em'
          }}>
            <input
              type="checkbox"
              id="favorite"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              style={{ width: '1.2em', height: '1.2em' }}
            />
            <label htmlFor="favorite" style={{ fontSize: '0.9em' }}>
              Add to favorites
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '0.8em',
              background: 'rgba(255, 107, 107, 0.2)',
              borderRadius: '8px',
              color: '#ff6b6b',
              fontSize: '0.9em',
              marginBottom: '1em'
            }}>
              {error}
            </div>
          )}

          {/* Info */}
          <div style={{
            padding: '0.8em',
            background: 'rgba(255, 140, 0, 0.1)',
            borderRadius: '8px',
            fontSize: '0.85em',
            marginBottom: '1em',
            opacity: 0.8
          }}>
            * At least one contact method (Nostr or Lightning) is required
          </div>

          {/* Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5em'
          }}>
            <button className="secondary-btn" onClick={onBack}>
              Cancel
            </button>
            <button className="primary-btn" onClick={handleSave}>
              {isEdit ? 'Update' : 'Save'} Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
