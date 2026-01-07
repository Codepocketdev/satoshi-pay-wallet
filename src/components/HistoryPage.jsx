import { FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export default function HistoryPage({ transactions, totalBalance, onClose }) {
  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          <FileText size={24} /> History
        </h1>
      </header>

      <div className="card balance-card-small">
        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#FF8C00' }}>{totalBalance} sats</div>
        <div style={{ fontSize: '0.85em', opacity: 0.6 }}>Total Balance</div>
      </div>

      {transactions.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', opacity: 0.6 }}>No transactions yet</p>
        </div>
      ) : (
        transactions.map(tx => (
          <div key={tx.id} className="card transaction-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  <span style={{ fontSize: '1.5em' }}>
                    {tx.type === 'send' ? <ArrowUpRight size={16} color="#ff6b6b" /> : <ArrowDownLeft size={16} color="#51cf66" />}
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: tx.type === 'send' ? '#ff6b6b' : '#51cf66' }}>
                      {tx.type === 'send' ? '-' : '+'}{tx.amount} sats
                    </div>
                    <div style={{ fontSize: '0.8em', opacity: 0.6 }}>{tx.note}</div>
                    {tx.status === 'pending' && (
                      <span style={{
                        fontSize: '0.75em',
                        background: 'rgba(255, 165, 0, 0.2)',
                        color: '#FFA500',
                        padding: '0.2em 0.5em',
                        borderRadius: '4px',
                        marginTop: '0.3em',
                        display: 'inline-block'
                      }}>
                        ⏳ Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.75em', opacity: 0.6, textAlign: 'right' }}>
                {new Date(tx.timestamp).toLocaleDateString()}<br/>
                {new Date(tx.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
