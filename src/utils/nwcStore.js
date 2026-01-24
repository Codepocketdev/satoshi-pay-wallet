import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools'
import { bytesToHex } from '@noble/hashes/utils.js'
import { SimplePool } from 'nostr-tools/pool'
import { nip04 } from 'nostr-tools'

const STORAGE_KEY = 'satoshi_pay_nwc'

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://relay.nostr.bg',
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostr.info',
  'wss://nostr.mom',
  'wss://relay.current.fyi',
  'wss://relay.orangepill.dev',
  'wss://purplepag.es',
  'wss://relay.nostrati.com',
  'wss://relay.arcade.city'
]

let _pool = null

const getRelayPool = () => {
  if (!_pool) {
    _pool = new SimplePool()
  }
  return _pool
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

export const nwcStore = {
  subscription: null,
  walletFunctions: null,

  getConnection() {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  },

  createConnection() {
    const walletSecretKey = generateSecretKey()
    const walletPublicKey = getPublicKey(walletSecretKey)

    const connectionSecret = generateSecretKey()
    const connectionPublicKey = getPublicKey(connectionSecret)

    const connection = {
      id: Date.now().toString(),
      name: 'Satoshi Pay',
      walletPublicKey: walletPublicKey,
      walletPrivateKey: bytesToHex(walletSecretKey),
      connectionSecret: bytesToHex(connectionSecret),
      connectionPublicKey: connectionPublicKey,
      enabled: false,
      budget: 100000,
      spent: 0,
      createdAt: Date.now()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(connection))
    return connection
  },

  updateConnection(updates) {
    const conn = this.getConnection()
    if (!conn) return null

    const updated = { ...conn, ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  },

  deleteConnection() {
    this.stopListening()
    localStorage.removeItem(STORAGE_KEY)
  },

  getConnectionURI(relays = DEFAULT_RELAYS) {
    const conn = this.getConnection()
    if (!conn) return null

    const relayParams = relays.map(r => `relay=${encodeURIComponent(r)}`).join('&')
    return `nostr+walletconnect://${conn.walletPublicKey}?${relayParams}&secret=${conn.connectionSecret}`
  },

  async handleGetInfo(conn) {
    return {
      result_type: 'get_info',
      result: {
        alias: 'Satoshi Pay',
        color: '#FF8C00',
        pubkey: conn.walletPublicKey,
        network: 'mainnet',
        methods: ['pay_invoice', 'make_invoice', 'get_balance', 'get_info']
      }
    }
  },

  async handleGetBalance(conn) {
    if (!this.walletFunctions?.getBalance) {
      throw new Error('Wallet functions not initialized')
    }

    const balance = await this.walletFunctions.getBalance()
    return {
      result_type: 'get_balance',
      result: {
        balance: balance * 1000
      }
    }
  },

  async handleMakeInvoice(conn, params) {
    if (!this.walletFunctions?.makeInvoice) {
      throw new Error('Make invoice not implemented')
    }

    const amountSats = Math.floor(params.amount / 1000)
    const invoice = await this.walletFunctions.makeInvoice(amountSats, params.description)

    return {
      result_type: 'make_invoice',
      result: {
        type: 'incoming',
        invoice: invoice,
        amount: params.amount
      }
    }
  },

  async handlePayInvoice(conn, params) {
    if (!this.walletFunctions?.payInvoice) {
      throw new Error('Pay invoice not implemented')
    }

    if (conn.spent >= conn.budget) {
      return {
        result_type: 'pay_invoice',
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Budget limit exceeded'
        }
      }
    }

    const result = await this.walletFunctions.payInvoice(params.invoice)

    if (result.amount) {
      this.updateConnection({ spent: conn.spent + result.amount })
    }

    return {
      result_type: 'pay_invoice',
      result: {
        preimage: result.preimage || ''
      }
    }
  },

  async handleCommand(conn, command, event) {
    try {
      let result

      switch (command.method) {
        case 'get_info':
          result = await this.handleGetInfo(conn)
          break
        case 'get_balance':
          result = await this.handleGetBalance(conn)
          break
        case 'make_invoice':
          result = await this.handleMakeInvoice(conn, command.params)
          break
        case 'pay_invoice':
          result = await this.handlePayInvoice(conn, command.params)
          break
        default:
          result = {
            result_type: command.method,
            error: {
              code: 'NOT_IMPLEMENTED',
              message: 'Method not supported'
            }
          }
      }

      await this.sendResponse(conn, result, event)
    } catch (error) {
      console.error('Command handling error:', error)
      await this.sendResponse(conn, {
        result_type: command.method,
        error: {
          code: 'INTERNAL',
          message: error.message
        }
      }, event)
    }
  },

  async sendResponse(conn, result, requestEvent) {
    try {
      const encrypted = await nip04.encrypt(
        conn.walletPrivateKey,
        requestEvent.pubkey,
        JSON.stringify(result)
      )

      const response = {
        kind: 23195,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', requestEvent.id],
          ['p', requestEvent.pubkey]
        ],
        content: encrypted,
        pubkey: conn.walletPublicKey
      }

      const signedEvent = finalizeEvent(response, hexToBytes(conn.walletPrivateKey))

      const pool = getRelayPool()
      await Promise.any(pool.publish(DEFAULT_RELAYS, signedEvent))
      console.log('NWC response sent')
    } catch (err) {
      console.error('Failed to send response:', err)
    }
  },

  async startListening(walletFunctions) {
    const conn = this.getConnection()
    if (!conn || !conn.enabled) {
      console.log('NWC not enabled')
      return
    }

    this.walletFunctions = walletFunctions
    this.stopListening()

    const pool = getRelayPool()

    try {
      const profileEvent = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify({
          name: 'Satoshi Pay Wallet',
          about: 'Cashu ecash wallet with NWC support'
        }),
        pubkey: conn.walletPublicKey
      }

      const signedProfile = finalizeEvent(profileEvent, hexToBytes(conn.walletPrivateKey))
      await Promise.any(pool.publish(DEFAULT_RELAYS, signedProfile))
      console.log('Profile published')
    } catch (err) {
      console.error('Profile publish failed:', err)
    }

    try {
      const existingInfoFilter = {
        kinds: [13194],
        authors: [conn.walletPublicKey]
      }

      const existing = await pool.querySync(DEFAULT_RELAYS, existingInfoFilter)

      if (existing.length === 0) {
        const infoEvent = {
          kind: 13194,
          created_at: Math.floor(Date.now() / 1000),
          tags: [
            ['encryption', 'nip04']
          ],
          content: 'pay_invoice make_invoice get_balance get_info',
          pubkey: conn.walletPublicKey
        }

        const signedInfo = finalizeEvent(infoEvent, hexToBytes(conn.walletPrivateKey))

        for (const relay of DEFAULT_RELAYS) {
          try {
            await pool.publish([relay], signedInfo)
            console.log(`Info published to ${relay}`)
          } catch (err) {
            console.error(`Failed ${relay}:`, err)
          }
        }

        console.log('Info event published')
      } else {
        console.log('Info event already exists')
      }
    } catch (err) {
      console.error('Info event failed:', err)
    }

    const filter = {
      kinds: [23194],
      '#p': [conn.walletPublicKey],
      since: Math.floor(Date.now() / 1000)
    }

    this.subscription = pool.subscribeMany(
      DEFAULT_RELAYS,
      [filter],
      {
        onevent: async (event) => {
          console.log('NWC request received:', event.id)

          try {
            const decrypted = await nip04.decrypt(
              conn.connectionSecret,
              event.pubkey,
              event.content
            )

            const command = JSON.parse(decrypted)
            console.log('NWC command:', command.method)

            await this.handleCommand(conn, command, event)
          } catch (err) {
            console.error('NWC error:', err)
          }
        },
        oneose: () => {
          console.log('NWC subscription active')
        }
      }
    )

    console.log('NWC listening started')
  },

  stopListening() {
    if (this.subscription) {
      this.subscription.close()
      this.subscription = null
    }
    console.log('NWC listening stopped')
  }
}
