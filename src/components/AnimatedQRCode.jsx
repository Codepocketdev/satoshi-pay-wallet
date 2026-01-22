import { useState, useEffect } from 'react'
import { generateQR } from '../utils/cashu.js'

export default function AnimatedQRCode({ data, size = 300 }) {
  const [qrCodes, setQrCodes] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loading, setLoading] = useState(true)

  // Split data into chunks
  const chunkData = (str, maxChunkSize = 800) => {
    const chunks = []
    for (let i = 0; i < str.length; i += maxChunkSize) {
      chunks.push(str.slice(i, i + maxChunkSize))
    }
    return chunks
  }

  useEffect(() => {
    const generateQRCodes = async () => {
      setLoading(true)
      
      // If data is small, just show one QR
      if (data.length <= 1000) {
        const qr = await generateQR(data)
        setQrCodes([qr])
      } else {
        // Split into chunks and generate QR for each
        const chunks = chunkData(data)
        const qrs = await Promise.all(
          chunks.map((chunk, index) => 
            generateQR(`${index + 1}/${chunks.length}:${chunk}`)
          )
        )
        setQrCodes(qrs)
      }
      
      setLoading(false)
    }

    if (data) {
      generateQRCodes()
    }
  }, [data])

  // Animate frames
  useEffect(() => {
    if (qrCodes.length <= 1) return

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % qrCodes.length)
    }, 1500) // Change frame every 1.5 seconds

    return () => clearInterval(interval)
  }, [qrCodes.length])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2em' }}>Generating QR...</div>
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {qrCodes[currentFrame] && (
        <img 
          src={qrCodes[currentFrame]} 
          alt="QR Code" 
          style={{ 
            maxWidth: `${size}px`, 
            width: '100%', 
            borderRadius: '8px' 
          }} 
        />
      )}
      
      {qrCodes.length > 1 && (
        <div style={{ 
          marginTop: '0.5em', 
          fontSize: '0.9em', 
          opacity: 0.8,
          fontWeight: 'bold',
          color: '#FF8C00'
        }}>
          Frame {currentFrame + 1} / {qrCodes.length}
        </div>
      )}
    </div>
  )
}
