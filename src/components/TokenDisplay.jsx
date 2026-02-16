import { Copy, ArrowLeft } from 'lucide-react'
import AnimatedQRCode from './AnimatedQRCode.jsx'

export default function TokenDisplay({ 
  token, 
  title = "Token Generated",
  subtitle = "Scan QR code or copy to send",
  onBack,
  onCopy 
}) {
  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1>{title}</h1>
      </header>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '1em'
      }}>
        
        {/* QR Code - Big and centered */}
        <div style={{ marginBottom: '2em' }}>
          <AnimatedQRCode data={token} size={300} />
        </div>

        {/* Subtitle */}
        <p style={{ 
          fontSize: '0.9em', 
          opacity: 0.7, 
          marginBottom: '1.5em',
          textAlign: 'center'
        }}>
          {subtitle}
        </p>

        {/* Token text */}
        <div className="token-box" style={{ marginBottom: '1em' }}>
          <textarea
            readOnly
            value={token}
            rows={4}
            style={{ fontSize: '0.7em' }}
          />
        </div>

        {/* Copy button */}
        <button 
          className="primary-btn" 
          onClick={() => onCopy(token)}
          style={{ width: '100%', maxWidth: '300px' }}
        >
          <Copy size={16} style={{ marginRight: '0.5em' }} />
          Copy Token
        </button>

        <p style={{ 
          fontSize: '0.75em', 
          opacity: 0.5, 
          marginTop: '1em',
          textAlign: 'center'
        }}>
          Token will auto-clear once recipient claims it
        </p>
      </div>
    </div>
  )
}
