import { Copy, Trash2, FileText, Lightbulb } from 'lucide-react'

export default function PendingTokens({ pendingTokens, onReclaim, onCopy, onRemove, onClose }) {
  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <FileText size={24} /> Pending Tokens
        </h1>
      </header>

      {pendingTokens.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.6 }}>
            No pending tokens
          </p>
          <p style={{ fontSize: '0.85em', opacity: 0.5, marginTop: '0.5em', textAlign: 'center' }}>
            Unsent tokens will appear here until claimed by recipient
          </p>
        </div>
      ) : (
        pendingTokens.map(pending => (
          <div key={pending.id} className="card" style={{ borderColor: '#FF8C00' }}>
            <div style={{ marginBottom: '1em' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#FF8C00' }}>
                {pending.amount} sats
              </div>
              <div style={{ fontSize: '0.8em', opacity: 0.6 }}>
                Created {new Date(pending.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="token-box">
              <textarea
                readOnly
                value={pending.token}
                rows={3}
                style={{ fontSize: '0.7em', marginBottom: '0.5em' }}
              />
            </div>

            <button
              className="copy-btn"
              onClick={() => onCopy(pending.token)}
              style={{ marginBottom: '0.5em' }}
            >
              <Copy size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Copy Token
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5em' }}>
              <button
                className="secondary-btn"
                onClick={() => onReclaim(pending)}
              >
                ↩️ Reclaim
              </button>
              <button
                className="cancel-btn"
                onClick={() => onRemove(pending.id)}
              >
                <Trash2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> Delete
              </button>
            </div>

            <p style={{ fontSize: '0.75em', opacity: 0.5, marginTop: '0.5em' }}>
              <Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em' }} /> This token will auto-delete once claimed by recipient
            </p>
          </div>
        ))
      )}
    </div>
  )
}
