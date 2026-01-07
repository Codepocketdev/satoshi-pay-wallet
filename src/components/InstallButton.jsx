import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowInstall(false)
    }

    setDeferredPrompt(null)
  }

  if (!showInstall) return null

  return (
    <button
      onClick={handleInstall}
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        background: 'linear-gradient(135deg, #FF8C00, #FFD700)',
        border: 'none',
        borderRadius: '50px',
        padding: '0.8em 1.5em',
        color: '#1a1a1a',
        fontWeight: 'bold',
        fontSize: '0.9em',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(255, 140, 0, 0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5em',
        animation: 'slideIn 0.5s ease-out'
      }}
    >
      <Download size={20} />
      <span>Install App</span>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(200px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </button>
  )
}
