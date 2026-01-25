import { useState } from 'react'
import { Search, User, Mail, Zap } from 'lucide-react'
import { contactsStore } from '../utils/contactsStore'

export default function ContactSelector({ 
  onBack, 
  onSelect, 
  filterType // 'nostr' or 'lightning'
}) {
  const [searchQuery, setSearchQuery] = useState('')

  const allContacts = contactsStore.getAllContacts()
    .filter(c => {
      if (filterType === 'nostr') return c.nostrPubkey
      if (filterType === 'lightning') return c.lightningAddress
      return true
    })
    .sort((a, b) => b.lastUsed - a.lastUsed)

  const filteredContacts = searchQuery
    ? contactsStore.searchContacts(searchQuery).filter(c => {
        if (filterType === 'nostr') return c.nostrPubkey
        if (filterType === 'lightning') return c.lightningAddress
        return true
      })
    : allContacts

  const handleSelect = (contact) => {
    contactsStore.updateLastUsed(contact.id)
    onSelect(contact)
  }

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Select Contact</h1>
      </header>

      <div style={{ padding: '1em' }}>
        {/* Search Bar */}
        <div style={{
          position: 'relative',
          marginBottom: '1em'
        }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '1em',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.5
            }}
          />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8em 1em 0.8em 3em',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '1em'
            }}
          />
        </div>

        {/* Empty State */}
        {filteredContacts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3em 1em',
            opacity: 0.6
          }}>
            <User size={64} style={{ opacity: 0.3, marginBottom: '1em' }} />
            <p>No contacts found</p>
            <p style={{ fontSize: '0.9em', marginTop: '0.5em' }}>
              {searchQuery ? 'Try a different search' : 'Add contacts in Settings'}
            </p>
          </div>
        )}

        {/* Contact List */}
        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            onClick={() => handleSelect(contact)}
            className="card"
            style={{
              marginBottom: '0.5em',
              padding: '1em',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1em'
            }}>
              {/* Avatar */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: contact.avatar
                  ? `url(${contact.avatar}) center/cover`
                  : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5em',
                fontWeight: 'bold'
              }}>
                {!contact.avatar && contact.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1em',
                  marginBottom: '0.3em'
                }}>
                  {contact.name}
                </h3>

                {/* Contact Methods */}
                <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                  {filterType === 'lightning' && contact.lightningAddress && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3em'
                    }}>
                      <Zap size={14} />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {contact.lightningAddress}
                      </span>
                    </div>
                  )}
                  {filterType === 'nostr' && contact.nostrPubkey && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3em'
                    }}>
                      <Mail size={14} />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {contact.nostrPubkey.substring(0, 20)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div style={{ opacity: 0.5 }}>→</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
