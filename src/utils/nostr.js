import { generateSecretKey, getPublicKey, finalizeEvent, nip04, nip19 } from 'nostr-tools'
import { SimplePool } from 'nostr-tools/pool'

// Default relays for Nostr
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.snort.social'
]

// Profile cache - 1 hour TTL
const PROFILE_CACHE_TTL = 3600000

function getCachedProfile(pubkey) {
  try {
    const raw = localStorage.getItem('satoshi_prof_' + pubkey)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > PROFILE_CACHE_TTL) return null
    return data
  } catch { 
    return null 
  }
}

function setCachedProfile(pubkey, data) {
  try {
    localStorage.setItem('satoshi_prof_' + pubkey, JSON.stringify({ 
      data, 
      ts: Date.now() 
    }))
  } catch {}
}

// Generate new Nostr keypair
export function generateNostrKeys() {
  const secretKey = generateSecretKey()
  const publicKey = getPublicKey(secretKey)
  
  return {
    nsec: nip19.nsecEncode(secretKey),
    npub: nip19.npubEncode(publicKey),
    secretKey: Array.from(secretKey),
    publicKey
  }
}

// Decode nsec to secret key bytes
export function decodeNsec(nsec) {
  try {
    const { type, data } = nip19.decode(nsec)
    if (type !== 'nsec') throw new Error('Not a valid nsec')
    return data
  } catch (err) {
    throw new Error('Invalid nsec key')
  }
}

// Decode npub to public key hex
export function decodeNpub(npub) {
  try {
    const { type, data } = nip19.decode(npub)
    if (type !== 'npub') throw new Error('Not a valid npub')
    return data
  } catch (err) {
    throw new Error('Invalid npub key')
  }
}

// Get npub from nsec
export function getNpubFromNsec(nsec) {
  const secretKey = decodeNsec(nsec)
  const publicKey = getPublicKey(secretKey)
  return nip19.npubEncode(publicKey)
}

// Send encrypted DM with ecash token
export async function sendNostrToken(nsec, recipientNpub, tokenString, message = '') {
  const pool = new SimplePool()
  const secretKey = decodeNsec(nsec)
  const publicKey = getPublicKey(secretKey)
  const recipientPubkey = decodeNpub(recipientNpub)
  
  // Create message with token
  const fullMessage = message 
    ? `${message}\n\n${tokenString}`
    : tokenString
  
  // Encrypt message
  const encryptedContent = await nip04.encrypt(secretKey, recipientPubkey, fullMessage)
  
  // Create DM event (kind 4)
  const event = finalizeEvent({
    kind: 4,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', recipientPubkey]],
    content: encryptedContent,
  }, secretKey)
  
  // Publish to relays
  try {
    await Promise.any(
      DEFAULT_RELAYS.map(relay => pool.publish([relay], event))
    )
    pool.close(DEFAULT_RELAYS)
    return true
  } catch (err) {
    pool.close(DEFAULT_RELAYS)
    throw new Error('Failed to publish to any relay')
  }
}

// Listen for incoming DMs with ecash tokens
export async function subscribeToNostrTokens(nsec, onTokenReceived) {
  const pool = new SimplePool()
  const secretKey = decodeNsec(nsec)
  const publicKey = getPublicKey(secretKey)
  
  // Subscribe to DMs sent to us
  const sub = pool.subscribeMany(
    DEFAULT_RELAYS,
    [
      {
        kinds: [4],
        '#p': [publicKey],
        since: Math.floor(Date.now() / 1000) - 3600 // Last hour
      }
    ],
    {
      onevent(event) {
        // Decrypt message
        nip04.decrypt(secretKey, event.pubkey, event.content)
          .then(decryptedContent => {
            // Check if message contains cashu token
            const tokenMatch = decryptedContent.match(/cashu[A-Za-z0-9]+/)
            if (tokenMatch) {
              onTokenReceived({
                token: tokenMatch[0],
                message: decryptedContent.replace(tokenMatch[0], '').trim(),
                from: event.pubkey,
                fromNpub: nip19.npubEncode(event.pubkey),
                timestamp: event.created_at
              })
            }
          })
          .catch(err => {
            console.error('Failed to decrypt DM:', err)
          })
      }
    }
  )
  
  return () => {
    sub.close()
    pool.close(DEFAULT_RELAYS)
  }
}

// Get Nostr profile metadata
export async function getNostrProfile(npub) {
  const pubkey = decodeNpub(npub)
  
  // Check cache first
  const cached = getCachedProfile(pubkey)
  if (cached) {
    console.log('✅ Profile from cache:', cached.name || cached.displayName)
    return cached
  }

  console.log('🔍 Fetching profile from relays...')
  const pool = new SimplePool()
  
  try {
    const events = await pool.querySync(DEFAULT_RELAYS, {
      kinds: [0],
      authors: [pubkey],
      limit: 1
    })
    
    pool.close(DEFAULT_RELAYS)
    
    if (events.length > 0) {
      const metadata = JSON.parse(events[0].content)
      const profile = {
        name: metadata.name,
        displayName: metadata.display_name || metadata.name,
        picture: metadata.picture,
        about: metadata.about,
        nip05: metadata.nip05
      }
      
      // Cache it
      setCachedProfile(pubkey, profile)
      console.log('✅ Profile fetched:', profile.name || profile.displayName)
      
      return profile
    }
    
    return null
  } catch (err) {
    console.error('❌ Profile fetch failed:', err)
    pool.close(DEFAULT_RELAYS)
    return null
  }
}

// Validate nsec format
export function isValidNsec(nsec) {
  try {
    decodeNsec(nsec)
    return true
  } catch {
    return false
  }
}

// Validate npub format
export function isValidNpub(npub) {
  try {
    decodeNpub(npub)
    return true
  } catch {
    return false
  }
}

// Format pubkey for display (first 8 + last 8 chars)
export function formatPubkey(npub) {
  if (npub.length < 20) return npub
  return `${npub.slice(0, 12)}...${npub.slice(-8)}`
}

// Generate NIP-98 HTTP Auth token
export async function generateNip98Token(nsec, url, method = 'GET', body = null) {
  try {
    const secretKey = decodeNsec(nsec)
    const publicKey = getPublicKey(secretKey)

    // Create NIP-98 event
    const event = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', url],
        ['method', method]
      ],
      content: '',
      pubkey: publicKey
    }

    // Add payload hash for POST requests
    if (body && method === 'POST') {
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(body))
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      event.tags.push(['payload', hashHex])
    }

    // Sign the event
    const signedEvent = finalizeEvent(event, secretKey)

    // Encode as base64
    const eventJson = JSON.stringify(signedEvent)
    const eventBase64 = btoa(eventJson)

    return eventBase64
  } catch (err) {
    console.error('Failed to generate NIP-98 token:', err)
    throw err
  }
}
