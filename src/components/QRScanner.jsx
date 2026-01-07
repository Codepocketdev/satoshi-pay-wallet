import { useRef, useState, useEffect } from 'react'

export default function QRScanner({ onScan, onClose, mode }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    let isActive = true

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })

        if (!isActive) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', true)
          videoRef.current.play()
          setScanning(true)

          videoRef.current.onloadedmetadata = () => {
            scanQRCode()
          }
        }

      } catch (err) {
        console.error('Camera error:', err)
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

    const scanQRCode = async () => {
      if (!isActive || !videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      const jsQR = (await import('jsqr')).default

      const scan = () => {
        if (!isActive || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(scan)
          return
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        })

        if (code) {
          isActive = false
          stopCamera()
          onScan(code.data)
          return
        }

        animationFrameRef.current = requestAnimationFrame(scan)
      }

      scan()
    }

    const stopCamera = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }

    startCamera()

    return () => {
      isActive = false
      stopCamera()
    }
  }, [onScan])

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    onClose()
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
            display: error ? 'none' : 'block'
          }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {scanning && !error && (
          <div style={{
            position: 'absolute',
            width: '250px',
            height: '250px',
            border: '3px solid #FFD700',
            borderRadius: '16px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}>
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
            cursor: 'pointer'
          }}
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
