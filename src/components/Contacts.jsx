import { useState, useEffect } from 'react'
import { User, Star, Search, Plus, Edit2, Trash2, Mail, Zap } from 'lucide-react'
import { contactsStore } from '../utils/contactsStore'

export default function Contacts({ onBack, onEdit }) {
  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = () => {
    setContacts(contactsStore.getAllContacts())
  }

  const handleDelete = (id, name) => {
    if (confirm(`Delete contact "${name}"?`)) {
      contactsStore.deleteContact(id)
      loadContacts()
    }
  }

  const handleToggleFavorite = (id) => {
    contactsStore.toggleFavorite(id)
    loadContacts()
  }

  const filteredContacts = searchQuery
    ? contactsStore.searchContacts(searchQuery)
    : contacts

  const favorites = filteredContacts.filter(c => c.favorite)
  const regular = filteredContacts.filter(c => !c.favorite)

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Contacts</h1>
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

        {/* Add Contact Button */}
        <button
          className="primary-btn"
          onClick={() => onEdit(null)}
          style={{
            width: '100%',
            marginBottom: '1.5em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em'
          }}
        >
          <Plus size={20} />
          Add Contact
        </button>

        {/* Empty State */}
        {contacts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3em 1em',
            opacity: 0.6
          }}>
            <User size={64} style={{ opacity: 0.3, marginBottom: '1em' }} />
            <p>No contacts yet</p>
            <p style={{ fontSize: '0.9em', marginTop: '0.5em' }}>
              Add contacts to quickly send payments
            </p>
          </div>
        )}

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <>
            <h3 style={{
              fontSize: '0.85em',
              opacity: 0.6,
              marginBottom: '0.5em',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Favorites
            </h3>
            {favorites.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => onEdit(contact.id)}
                onDelete={() => handleDelete(contact.id, contact.name)}
                onToggleFavorite={() => handleToggleFavorite(contact.id)}
              />
            ))}
          </>
        )}

        {/* All Contacts Section */}
        {regular.length > 0 && (
          <>
            <h3 style={{
              fontSize: '0.85em',
              opacity: 0.6,
              marginBottom: '0.5em',
              marginTop: favorites.length > 0 ? '1.5em' : 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              All Contacts
            </h3>
            {regular.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => onEdit(contact.id)}
                onDelete={() => handleDelete(contact.id, contact.name)}
                onToggleFavorite={() => handleToggleFavorite(contact.id)}
              />
            ))}
          </>
        )}

        {/* No Results */}
        {filteredContacts.length === 0 && contacts.length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2em 1em',
            opacity: 0.6
          }}>
            <Search size={48} style={{ opacity: 0.3, marginBottom: '0.5em' }} />
            <p>No contacts found</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ContactCard({ contact, onEdit, onDelete, onToggleFavorite }) {
  return (
    <div className="card" style={{
      marginBottom: '0.5em',
      padding: '1em'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1em'
      }}>
        {/* Avatar */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: contact.avatar
            ? `url(${contact.avatar}) center/cover`
            : 'linear-gradient(135deg, #FF8C00 0%, #FFA500 100%)',
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5em',
            marginBottom: '0.3em'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.1em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {contact.name}
            </h3>
            <button
              onClick={onToggleFavorite}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.2em',
                cursor: 'pointer',
                color: contact.favorite ? '#FFD700' : 'rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Star size={16} fill={contact.favorite ? '#FFD700' : 'none'} />
            </button>
          </div>

          {/* Contact Methods */}
          <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
            {contact.lightningAddress && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3em',
                marginBottom: '0.2em'
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
            {contact.nostrPubkey && (
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

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '0.5em'
        }}>
          <button
            onClick={onEdit}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5em',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: 'rgba(255, 107, 107, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5em',
              cursor: 'pointer',
              color: '#ff6b6b',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
