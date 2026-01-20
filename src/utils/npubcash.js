import { generateNip98Token, decodeNsec } from './nostr.js'
import { getPublicKey, nip19 } from 'nostr-tools'

const NPUBCASH_BASE_URL = 'https://npub.cash'

/**
 * Get Lightning Address info from npub.cash
 * Returns: { mintUrl, npub, username, error }
 */
export async function getNpubcashInfo(nsec) {
  try {
    const url = `${NPUBCASH_BASE_URL}/api/v1/info`
    const authToken = await generateNip98Token(nsec, url, 'GET')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Nostr ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.error) {
      return { error: data.error }
    }

    return {
      mintUrl: data.mintUrl || '',
      npub: data.npub || '',
      username: data.username || '',
      error: null
    }
  } catch (err) {
    console.error('npub.cash info error:', err)
    return { error: err.message }
  }
}

/**
 * Get balance of unclaimed sats on npub.cash
 * Returns: number (sats) or 0 on error
 */
export async function getNpubcashBalance(nsec) {
  try {
    const url = `${NPUBCASH_BASE_URL}/api/v1/balance`
    const authToken = await generateNip98Token(nsec, url, 'GET')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Nostr ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.error || !data.data) {
      return 0
    }

    return data.data
  } catch (err) {
    console.error('npub.cash balance error:', err)
    return 0
  }
}

/**
 * Claim waiting sats as Cashu token
 * Returns: { token, error }
 */
export async function claimNpubcashToken(nsec) {
  try {
    const url = `${NPUBCASH_BASE_URL}/api/v1/claim`
    const authToken = await generateNip98Token(nsec, url, 'GET')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Nostr ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (data.error) {
      return { error: data.error }
    }

    if (!data.data || !data.data.token) {
      return { error: 'No token received' }
    }

    return {
      token: data.data.token,
      error: null
    }
  } catch (err) {
    console.error('npub.cash claim error:', err)
    return { error: err.message }
  }
}

/**
 * Get Lightning Address for a given nsec
 * Format: npub@npub.cash or username@npub.cash
 */
export async function getLightningAddress(nsec) {
  try {
    const info = await getNpubcashInfo(nsec)

    if (info.error) {
      // If API fails, generate from npub
      const secretKey = decodeNsec(nsec)
      const publicKey = getPublicKey(secretKey)
      const npub = nip19.npubEncode(publicKey)
      return `${npub}@npub.cash`
    }

    // Use custom username if available
    if (info.username) {
      return `${info.username}@npub.cash`
    }

    // Fall back to npub
    return `${info.npub}@npub.cash`
  } catch (err) {
    console.error('Failed to get Lightning Address:', err)
    return null
  }
}
