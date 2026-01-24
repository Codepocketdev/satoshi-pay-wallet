import { useState, useEffect } from 'react'
import { Copy, QrCode, Power, Trash2, CheckCircle } from 'lucide-react'
import { nwcStore } from '../utils/nwcStore'
import AnimatedQRCode from './AnimatedQRCode'

export default function NWCSettings({ onClose }) {
  const [connection, setConnection] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load connection on mount
  useEffect(() => {
    const conn = nwcStore.getConnection()
    setConnection(conn)
  }, [])

  const handleCreate = () => {
    const newConn = nwcStore.createConnection()
    setConnection(newConn)
  }

  const handleToggle = async () => {
    const newEnabled = !connection.enabled
    const updated = nwcStore.updateConnection({ enabled: newEnabled })
    setConnection(updated)
    
    if (!newEnabled) {
      nwcStore.stopListening()
    }
  }

  const handleDelete = () => {
    nwcStore.deleteConnection()
    setConnection(null)
  }

  const handleCopy = async () => {
    const uri = nwcStore.getConnectionURI()
    await navigator.clipboard.writeText(uri)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show QR Page
  if (showQR) {
    return (
      <div className="app">
        <header>
          <button className="back-btn" onClick={() => setShowQR(false)}>← Back</button>
          <h1>QR Code</h1>
        </header>
        
        <div style={{ padding: '1em' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ background: 'white', padding: '1em', borderRadius: '8px', marginBottom: '1em' }}>
              <AnimatedQRCode 
                data={nwcStore.getConnectionURI()}
                size={280}
              />
            </div>
            <p style={{ fontSize: '0.9em', opacity: 0.7 }}>
              Scan with your NWC-compatible app
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main Page
  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h1>NWC</h1>
      </header>

      <div style={{ padding: '1em' }}>
        {/* Status */}
        <div className="card" style={{ marginBottom: '1em' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5em',
            padding: '0.4em 0.8em',
            borderRadius: '20px',
            background: connection?.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
            fontSize: '0.85em'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: connection?.enabled ? '#22C55E' : '#6B7280'
            }} />
            {connection?.enabled ? 'Active' : 'Inactive'}
          </div>
        </div>

        {/* No Connection */}
        {!connection && (
          <div className="card" style={{ textAlign: 'center', padding: '3em 1em' }}>
            <div style={{ fontSize: '3em', marginBottom: '0.5em' }}>⚡</div>
            <h3 style={{ marginBottom: '0.5em' }}>No NWC connection</h3>
            <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '1.5em' }}>
              Let apps control your wallet remotely
            </p>
            <button 
              className="primary-btn"
              onClick={handleCreate}
            >
              Create Connection
            </button>
          </div>
        )}

        {/* Has Connection */}
        {connection && (
          <div className="card" style={{ marginBottom: '1em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1em' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', marginBottom: '0.3em' }}>
                  <h3 style={{ margin: 0 }}>{connection.name}</h3>
                  <button
                    onClick={handleToggle}
                    style={{
                      padding: '0.3em 0.6em',
                      borderRadius: '12px',
                      border: 'none',
                      background: connection.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                      color: connection.enabled ? '#22C55E' : '#6B7280',
                      fontSize: '0.75em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3em'
                    }}
                  >
                    <Power size={12} />
                    {connection.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p style={{ fontSize: '0.8em', opacity: 0.6, margin: 0 }}>
                  Created {new Date(connection.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={handleDelete}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  padding: '0.5em'
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Budget */}
            <div style={{ 
              padding: '0.8em',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              marginBottom: '1em'
            }}>
              <div style={{ fontSize: '0.85em', marginBottom: '0.5em' }}>
                Budget: {connection.spent.toLocaleString()} / {connection.budget.toLocaleString()} sats
              </div>
              <div style={{ 
                width: '100%', 
                height: '6px', 
                background: 'rgba(59, 130, 246, 0.2)', 
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${Math.min(100, (connection.spent / connection.budget) * 100)}%`,
                  height: '100%',
                  background: '#3B82F6'
                }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5em', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowQR(true)}
                className="secondary-btn"
                style={{ flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3em', fontSize: '0.85em' }}
              >
                <QrCode size={16} />
                QR Code
              </button>
              <button
                onClick={handleCopy}
                className="secondary-btn"
                style={{ flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3em', fontSize: '0.85em' }}
              >
                {copied ? (
                  <><CheckCircle size={16} /> Copied!</>
                ) : (
                  <><Copy size={16} /> Copy URI</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="card" style={{ background: 'rgba(255, 140, 0, 0.1)', border: '1px solid rgba(255, 140, 0, 0.3)' }}>
          <h3 style={{ color: '#FF8C00', marginTop: 0 }}>⚠️ Important</h3>
          <ul style={{ fontSize: '0.9em', opacity: 0.9, paddingLeft: '1.5em', margin: '0.5em 0' }}>
            <li>Apps can control your wallet remotely</li>
            <li>Budget limit: {connection ? connection.budget.toLocaleString() : '100,000'} sats</li>
            <li>Only connect apps you trust</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
