import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'
import { getDecodedToken } from '@cashu/cashu-ts'

// Custom helper functions (no @noble/hashes dependency)
const bytesToHex = (bytes) => {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

// P2PK Key Type
export class P2PKKey {
  constructor(publicKey, privateKey, used = false, usedCount = 0) {
    this.publicKey = publicKey
    this.privateKey = privateKey
    this.used = used
    this.usedCount = usedCount
  }
}

// Load P2PK keys from localStorage
export const loadP2PKKeys = () => {
  try {
    const saved = localStorage.getItem('cashu_p2pk_keys')
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Error loading P2PK keys:', err)
    return []
  }
}

// Save P2PK keys to localStorage
export const saveP2PKKeys = (keys) => {
  try {
    localStorage.setItem('cashu_p2pk_keys', JSON.stringify(keys))
  } catch (err) {
    console.error('Error saving P2PK keys:', err)
  }
}

// Generate new P2PK keypair
export const generateP2PKKeypair = () => {
  const sk = generateSecretKey() // Uint8Array
  const pk = '02' + getPublicKey(sk) // Hex with Cashu prefix
  const skHex = bytesToHex(sk)

  console.log('[P2PK] Generated new keypair')
  console.log('[P2PK] Public key:', pk.substring(0, 16) + '...')

  const keyPair = new P2PKKey(pk, skHex, false, 0)

  // Save to storage
  const keys = loadP2PKKeys()
  keys.push(keyPair)
  saveP2PKKeys(keys)

  return keyPair
}

// Import nsec key
export const importNsec = (nsec) => {
  if (!nsec || !nsec.startsWith('nsec1')) {
    throw new Error('Invalid nsec format')
  }

  const { data } = nip19.decode(nsec)
  const sk = data // Uint8Array
  const pk = '02' + getPublicKey(sk)
  const skHex = bytesToHex(sk)

  // Check if already exists
  const keys = loadP2PKKeys()
  if (keys.find(k => k.publicKey === pk)) {
    throw new Error('This key already exists')
  }

  const keyPair = new P2PKKey(pk, skHex, false, 0)
  keys.push(keyPair)
  saveP2PKKeys(keys)

  console.log('[P2PK] Imported nsec successfully')
  return keyPair
}

// Convert npub to hex pubkey
export const maybeConvertNpub = (key) => {
  if (key && key.startsWith('npub1')) {
    try {
      const { data } = nip19.decode(key)
      return '02' + data
    } catch (err) {
      console.error('Invalid npub:', err)
      return key
    }
  }
  return key
}

// Validate pubkey format
export const isValidPubkey = (key) => {
  key = maybeConvertNpub(key)
  return key && key.length === 66 && key.startsWith('02')
}

// Check if we have this key
export const haveThisKey = (pubkey) => {
  const keys = loadP2PKKeys()
  return keys.some(k => k.publicKey === pubkey)
}

// Mark key as used
export const setPrivateKeyUsed = (privateKey) => {
  const keys = loadP2PKKeys()
  const key = keys.find(k => k.privateKey === privateKey)
  if (key) {
    key.used = true
    key.usedCount = (key.usedCount || 0) + 1
    saveP2PKKeys(keys)
    console.log('[P2PK] Marked key as used')
  }
}

// Get pubkey from P2PK-locked secret
export const getSecretP2PKPubkey = (secret) => {
  try {
    const secretObject = JSON.parse(secret)

    // Check if P2PK locked
    if (secretObject[0] !== 'P2PK' || !secretObject[1]?.data) {
      return '' // Not P2PK locked
    }

    // Get P2PK data
    const now = Math.floor(Date.now() / 1000)
    const { data, tags } = secretObject[1]

    // Check for locktime
    const locktimeTag = tags?.find(tag => tag[0] === 'locktime')
    const locktime = locktimeTag ? parseInt(locktimeTag[1], 10) : Infinity

    // Check for refund keys
    const refundTag = tags?.find(tag => tag[0] === 'refund')
    const refundKeys = refundTag && refundTag.length > 1 ? refundTag.slice(1) : []

    // Check for additional pubkeys
    const pubkeysTag = tags?.find(tag => tag[0] === 'pubkeys')
    const pubkeys = pubkeysTag && pubkeysTag.length > 1 ? pubkeysTag.slice(1) : []

    // Check for n_sigs (multisig)
    const n_sigsTag = tags?.find(tag => tag[0] === 'n_sigs')
    const n_sigs = n_sigsTag ? parseInt(n_sigsTag[1], 10) : undefined

    // If locktime is active
    if (locktime > now) {
      console.log('[P2PK] Locktime is active')

      // Check multisig pubkeys
      if (n_sigs && n_sigs >= 1) {
        for (const pk of pubkeys) {
          if (haveThisKey(pk)) return pk
        }
      }

      return data // Main lock key
    }

    // If locktime expired, check refund keys
    if (refundKeys.length > 0) {
      console.log('[P2PK] Checking refund keys')
      for (const pk of refundKeys) {
        if (haveThisKey(pk)) return pk
      }
      return refundKeys[0] // Show as locked
    }

    console.log('[P2PK] Lock has expired')
    return data

  } catch (err) {
    // Not P2PK or invalid format
    return ''
  }
}

// Check if proofs are P2PK locked
export const isLocked = (proofs) => {
  if (!proofs || !Array.isArray(proofs)) return false

  for (const proof of proofs) {
    if (getSecretP2PKPubkey(proof.secret)) {
      return true
    }
  }
  return false
}

// Check if proofs are locked to us
export const isLockedToUs = (proofs) => {
  if (!proofs || !Array.isArray(proofs)) return false

  for (const proof of proofs) {
    const pubkey = getSecretP2PKPubkey(proof.secret)
    if (pubkey && haveThisKey(pubkey)) {
      return true
    }
  }
  return false
}

// Get private key for P2PK-locked token (2.7.4 compatible)
export const getPrivateKeyForP2PKToken = (token) => {
  try {
    const decoded = getDecodedToken(token)
    console.log('[P2PK] Decoded token:', decoded)
    
    // Handle different token formats in 2.7.4
    let proofs
    if (decoded.token && Array.isArray(decoded.token)) {
      // Old format: { token: [{ mint: ..., proofs: [...] }] }
      proofs = decoded.token[0].proofs
      console.log('[P2PK] Using OLD token format')
    } else if (decoded.proofs) {
      // New format: { mint: ..., proofs: [...] }
      proofs = decoded.proofs
      console.log('[P2PK] Using NEW token format (2.7.4)')
    } else if (Array.isArray(decoded)) {
      // Direct array: [{ mint: ..., proofs: [...] }]
      proofs = decoded[0].proofs
      console.log('[P2PK] Using DIRECT ARRAY format')
    } else {
      console.error('[P2PK] Unknown token structure:', decoded)
      return ''
    }

    if (!proofs || !Array.isArray(proofs)) {
      console.error('[P2PK] No proofs found in token')
      return ''
    }

    console.log('[P2PK] Checking', proofs.length, 'proofs for locks')

    if (!isLocked(proofs)) {
      console.log('[P2PK] Token is not P2PK locked')
      return ''
    }

    if (!isLockedToUs(proofs)) {
      console.log('[P2PK] Token is locked but not to us')
      return ''
    }

    // Find matching private key
    for (const proof of proofs) {
      const pubkey = getSecretP2PKPubkey(proof.secret)
      console.log('[P2PK] Proof pubkey:', pubkey ? pubkey.substring(0, 16) + '...' : 'none')
      
      if (pubkey && haveThisKey(pubkey)) {
        const keys = loadP2PKKeys()
        const key = keys.find(k => k.publicKey === pubkey)
        if (key) {
          console.log('[P2PK] ✅ Found matching key!')
          return key.privateKey
        }
      }
    }

    console.error('[P2PK] ❌ No matching private key found')
    return ''
  } catch (err) {
    console.error('[P2PK] Error getting private key:', err)
    return ''
  }
}

// Delete a P2PK key
export const deleteP2PKKey = (publicKey) => {
  const keys = loadP2PKKeys()
  const filtered = keys.filter(k => k.publicKey !== publicKey)
  saveP2PKKeys(filtered)
  console.log('[P2PK] Deleted key')
}

// Get P2PK settings
export const getP2PKSettings = () => {
  return {
    showQuickAccess: localStorage.getItem('p2pk_quick_access') === 'true'
  }
}

// Save P2PK settings
export const setP2PKSettings = (settings) => {
  if (settings.showQuickAccess !== undefined) {
    localStorage.setItem('p2pk_quick_access', settings.showQuickAccess.toString())
  }
}
