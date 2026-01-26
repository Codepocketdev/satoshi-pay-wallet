import { useState } from 'react'
import { User, Star } from 'lucide-react'

export default function SaveContactPrompt({ contact, onSave, onSkip }) {
  const [name, setName] = useState(contact.name || '')
  const [favorite, setFavorite] = useState(false)

  return (
    <div className="app" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1em'
    }}>
      <div className="card" style={{
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: '3em',
          marginBottom: '0.5em'
        }}>
          💾
        </div>
        
        <h3 style={{ textAlign: 'center', marginBottom: '0.5em' }}>
          Save this contact?
        </h3>
        
        <p style={{
          textAlign: 'center',
          fontSize: '0.9em',
          opacity: 0.7,
          marginBottom: '1.5em'
        }}>
          Quick save for future payments
        </p>

        {/* Name Input */}
        <div style={{ marginBottom: '1em' }}>
          <label style={{
            display: 'block',
            fontSize: '0.85em',
            opacity: 0.7,
            marginBottom: '0.5em'
          }}>
            <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} />
            Name (optional)
          </label>
          <input
            type="text"
            placeholder="Alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
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

        {/* Favorite Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5em',
          marginBottom: '1.5em'
        }}>
          <input
            type="checkbox"
            id="favorite"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            style={{ width: '1.2em', height: '1.2em' }}
          />
          <label htmlFor="favorite" style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '0.3em' }}>
            <Star size={16} fill={favorite ? '#FFD700' : 'none'} color={favorite ? '#FFD700' : 'currentColor'} />
            Add to favorites
          </label>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5em'
        }}>
          <button
            className="secondary-btn"
            onClick={onSkip}
          >
            Skip
          </button>
          <button
            className="primary-btn"
            onClick={() => onSave(name, favorite)}
          >
            Save Contact
          </button>
        </div>
      </div>
    </div>
  )
}
