import { useRef, useState, useEffect } from 'react'
import QrScanner from 'qr-scanner'

export default function QRScanner({ onScan, onClose, mode }) {
  const videoRef = useRef(null)
  const scannerRef = useRef(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameras, setCameras] = useState([])
  const [facingMode, setFacingMode] = useState('environment')

  useEffect(() => {
    let isActive = true

    const initScanner = async () => {
      try {
        // Check if camera is available
        const hasCamera = await QrScanner.hasCamera()
        if (!hasCamera) {
          setError('No camera found on this device.')
          return
        }

        if (!videoRef.current || !isActive) return

        // Create scanner instance
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => handleScanSuccess(result),
          {
            returnDetailedScanResult: true,
            highlightScanRegion: false,
            highlightCodeOutline: false,
          }
        )

        // Start scanning
        await scannerRef.current.start()
        setScanning(true)

        // Get available cameras
        const cameraList = await QrScanner.listCameras(true)
        setCameras(cameraList)

        // Set initial camera if multiple available
        if (cameraList.length > 1) {
          await scannerRef.current.setCamera(facingMode)
        }

      } catch (err) {
        console.error('Scanner error:', err)
        if (!isActive) return

        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else if (err.name === 'NotReadableError') {
          setError('Camera is busy. Close other apps using the camera.')
        } else {
          setError(`Camera error: ${err.message}`)
        }
      }
    }

    const handleScanSuccess = (result) => {
      if (!isActive) return

      // Ensure we have valid data
      if (!result || !result.data) return

      const detectedToken = detectTokenType(result.data)
      
      // Only process relevant tokens based on mode
      if (mode === 'send') {
        // Accept lightning invoices, cashu tokens, lightning addresses
        if (['lightning', 'cashu', 'lightning_address', 'cashu_request'].includes(detectedToken.type)) {
          cleanup()
          onScan(detectedToken.data || detectedToken.raw || '') // Return just the cleaned data string
        }
      } else if (mode === 'receive') {
        // Only accept cashu tokens
        if (detectedToken.type === 'cashu') {
          cleanup()
          onScan(detectedToken.data || detectedToken.raw || '') // Return just the cleaned data string
        }
      } else {
        // Default: accept anything
        cleanup()
        onScan(detectedToken.data || detectedToken.raw || '') // Return just the cleaned data string
      }
    }

    const detectTokenType = (data) => {
      const lowerData = data.toLowerCase()

      // Lightning Invoice
      if (lowerData.startsWith('lightning:') || lowerData.startsWith('lnbc')) {
        const invoice = lowerData.startsWith('lightning:') 
          ? data.split(':')[1] 
          : data
        return { type: 'lightning', data: invoice, raw: data }
      }
      
      // Cashu Token
      if (lowerData.startsWith('cashu')) {
        let token = lowerData.startsWith('cashu:') 
          ? data.split(':')[1] 
          : data.substring(5) // Remove 'cashu' prefix
        
        if (token.startsWith('//')) {
          token = token.slice(2)
        }
        
        // Check if it's a Cashu Request
        if (token.toLowerCase().startsWith('creq')) {
          return { type: 'cashu_request', data: token, raw: data }
        }
        
        return { type: 'cashu', data: token, raw: data }
      }
      
      // Cashu Request (without cashu: prefix)
      if (lowerData.startsWith('creq')) {
        return { type: 'cashu_request', data, raw: data }
      }
      
      // Lightning Address (user@domain.com)
      if (data.includes('@') && data.includes('.') && !data.includes(' ')) {
        return { type: 'lightning_address', data, raw: data }
      }
      
      // Unknown/unsupported
      return { type: 'unknown', data, raw: data }
    }

    const cleanup = () => {
      isActive = false
      if (scannerRef.current) {
        scannerRef.current.stop()
        scannerRef.current.destroy()
        scannerRef.current = null
      }
    }

    initScanner()

    return () => {
      cleanup()
    }
  }, [onScan, mode, facingMode])

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current.destroy()
    }
    onClose()
  }

  const toggleCamera = async () => {
    if (!scannerRef.current || cameras.length <= 1) return

    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment'
    
    try {
      await scannerRef.current.setCamera(newFacingMode)
      setFacingMode(newFacingMode)
    } catch (err) {
      console.error('Failed to switch camera:', err)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '1em',
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#000',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        {mode === 'send' ? 'Scan Lightning invoice or Cashu token' : 'Scan Cashu token'}
      </div>

      {error && (
        <div style={{
          margin: '1em',
          padding: '1.5em',
          background: 'rgba(255, 107, 107, 0.95)',
          borderRadius: '12px',
          color: 'white',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5em' }}>⚠️ Error</div>
          {error}
          <div style={{ marginTop: '1em', fontSize: '0.9em' }}>
            Try: Close other camera apps and reload the page
          </div>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1em',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '16px',
            display: error ? 'none' : 'block',
            objectFit: 'cover'
          }}
          playsInline
          muted
        />

        {scanning && !error && (
          <>
            {/* Scan frame overlay */}
            <div style={{
              position: 'absolute',
              width: '250px',
              height: '250px',
              border: '3px solid #FFD700',
              borderRadius: '16px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none'
            }}>
              {/* Corner accents */}
              <div style={{
                position: 'absolute',
                top: '-3px',
                left: '-3px',
                width: '40px',
                height: '40px',
                borderTop: '5px solid #FFD700',
                borderLeft: '5px solid #FFD700'
              }}/>
              <div style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '40px',
                height: '40px',
                borderTop: '5px solid #FFD700',
                borderRight: '5px solid #FFD700'
              }}/>
              <div style={{
                position: 'absolute',
                bottom: '-3px',
                left: '-3px',
                width: '40px',
                height: '40px',
                borderBottom: '5px solid #FFD700',
                borderLeft: '5px solid #FFD700'
              }}/>
              <div style={{
                position: 'absolute',
                bottom: '-3px',
                right: '-3px',
                width: '40px',
                height: '40px',
                borderBottom: '5px solid #FFD700',
                borderRight: '5px solid #FFD700'
              }}/>
              {/* Scanning line animation */}
              <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
                animation: 'scan 2s linear infinite'
              }}/>
            </div>

            {/* Camera switch button */}
            {cameras.length > 1 && (
              <button
                onClick={toggleCamera}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(255, 215, 0, 0.9)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  transition: 'transform 0.2s',
                  zIndex: 10
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                🔄
              </button>
            )}
          </>
        )}
      </div>

      <div style={{
        padding: '1.5em',
        background: 'rgba(0, 0, 0, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            maxWidth: '300px',
            margin: '0 auto',
            display: 'block',
            padding: '1em 2em',
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1em',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
        >
          CLOSE
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(250px); }
        }
      `}</style>
    </div>
  )
}
