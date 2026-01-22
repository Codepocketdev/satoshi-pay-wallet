import { useState } from 'react'
import { Search, Star, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { KYMHandler } from 'cashu-kym'

export default function MintDiscovery({ onAddMint, allMints, onClose }) {
  const [discovering, setDiscovering] = useState(false)
  const [discoveredMints, setDiscoveredMints] = useState([])
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const discover = async () => {
    try {
      setDiscovering(true)
      setError('')

      const handler = new KYMHandler({
        auditorBaseUrl: 'https://api.audit.8333.space',
        relays: ['wss://relay.damus.io', 'wss://relay.primal.net'],
        timeout: 5000
      })

      const result = await handler.discover()
      const mints = result.sortByScore()
      
      setDiscoveredMints(mints)
    } catch (err) {
      console.error('Discovery error:', err)
      setError('Failed to discover mints. Please try again.')
    } finally {
      setDiscovering(false)
    }
  }

  const isExistingMint = (url) => {
    return allMints.some(m => m.url === url)
  }

  const handleAddMint = (mint) => {
    const name = mint.auditorData?.name || mint.url.replace('https://', '').replace('http://', '')
    onAddMint(name, mint.url)
  }

  const filteredMints = searchQuery
    ? discoveredMints.filter(m => 
        m.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.auditorData?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : discoveredMints

  return (
    <div className="app">
      <header>
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
          Discover Mints
        </h1>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ marginBottom: '1em' }}>
        <p style={{ marginBottom: '1em', opacity: 0.8 }}>
          Find trusted Cashu mints rated by the community
        </p>
        
        <button
          className="primary-btn"
          onClick={discover}
          disabled={discovering}
          style={{ width: '100%' }}
        >
          {discovering ? 'Discovering Mints...' : '🔍 Discover Mints'}
        </button>
      </div>

      {discoveredMints.length > 0 && (
        <>
          <div style={{ marginBottom: '1em' }}>
            <input
              type="text"
              placeholder="Search mints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '1em' }}>
            Found {filteredMints.length} mints
          </div>

          {filteredMints.map((mint) => (
            <div
              key={mint.url}
              className="card"
              style={{
                marginBottom: '1em',
                opacity: isExistingMint(mint.url) ? 0.5 : 1
              }}
            >
              <div style={{ marginBottom: '0.8em' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.3em' }}>
                  {mint.auditorData?.name || mint.url}
                </div>
                <div style={{ fontSize: '0.75em', opacity: 0.6, wordBreak: 'break-all' }}>
                  {mint.url}
                </div>
              </div>

              {mint.score && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3em', marginBottom: '0.5em' }}>
                  <Star size={14} fill="#FF8C00" color="#FF8C00" />
                  <span style={{ fontWeight: 'bold', color: '#FF8C00' }}>
                    {mint.score.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '0.85em', opacity: 0.6 }}>
                    ({mint.recommendations?.length || 0} reviews)
                  </span>
                </div>
              )}

              {mint.auditorData && (
                <div style={{ 
                  fontSize: '0.8em', 
                  opacity: 0.7, 
                  display: 'flex', 
                  gap: '1em',
                  marginBottom: '0.8em'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3em' }}>
                    <TrendingUp size={12} />
                    {mint.auditorData.mints} mints
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3em' }}>
                    <Clock size={12} />
                    {mint.auditorData.melts} melts
                  </span>
                  {mint.auditorData.errors > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3em', color: '#FF6B6B' }}>
                      <AlertCircle size={12} />
                      {mint.auditorData.errors} errors
                    </span>
                  )}
                </div>
              )}

              {isExistingMint(mint.url) ? (
                <button className="secondary-btn" disabled style={{ width: '100%' }}>
                  ✓ Already Added
                </button>
              ) : (
                <button
                  className="primary-btn"
                  onClick={() => handleAddMint(mint)}
                  style={{ width: '100%' }}
                >
                  + Add Mint
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
