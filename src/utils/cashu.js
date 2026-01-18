import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import CryptoJS from 'crypto-js'

export const DEFAULT_MINTS = [
  { name: 'Mint.btcforplebs', url: 'https://mint.btcforplebs.com' },
  { name: 'Kashu', url: 'https://kashu.me' }
]

export const WALLET_NAME = 'Satoshi Pay'

// Vibration helper
export const vibrate = (pattern = [100]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Seed phrase utilities
export const generateWalletSeed = () => {
  return generateMnemonic(wordlist)
}

export const deriveMasterKey = (seed) => {
  return mnemonicToSeedSync(seed)
}

export const deriveEncryptionKey = (seed) => {
  const seedBuffer = mnemonicToSeedSync(seed)
  return CryptoJS.SHA256(seedBuffer.toString('hex')).toString()
}

export const encryptProofs = (proofs, masterKey) => {
  return CryptoJS.AES.encrypt(JSON.stringify(proofs), masterKey).toString()
}

export const decryptProofs = (encryptedData, masterKey) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, masterKey)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  } catch (err) {
    throw new Error('Invalid seed phrase or corrupted data')
  }
}

export const generateQR = async (data) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(data)}`
  return qrUrl
}
