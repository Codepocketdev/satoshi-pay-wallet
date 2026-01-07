import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveProofsForMint, getProofsForMint } from '../utils/storage'

describe('Storage with Quota Detection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves proofs successfully', () => {
    const proofs = [{ amount: 100, secret: 'test' }]
    const result = saveProofsForMint('test-mint', proofs)

    expect(result.success).toBe(true)
  })

  it('detects quota exceeded error', () => {
    // Mock localStorage to throw QuotaExceededError
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = vi.fn(() => {
      const err = new Error('QuotaExceededError')
      err.name = 'QuotaExceededError'
      throw err
    })

    const proofs = [{ amount: 100, secret: 'test' }]
    const result = saveProofsForMint('test-mint', proofs)

    expect(result.success).toBe(false)
    expect(result.error).toBe('QuotaExceededError')

    Storage.prototype.setItem = originalSetItem
  })

  it('retrieves saved proofs', () => {
    const originalSetItem = Storage.prototype.setItem
    let storedValue = null

    Storage.prototype.setItem = vi.fn((key, value) => {
      storedValue = { key, value }
    })

    Storage.prototype.getItem = vi.fn((key) => {
      return storedValue && storedValue.key === key ? storedValue.value : null
    })

    const proofs = [{ amount: 100, secret: 'test' }]
    saveProofsForMint('test-mint', proofs)

    const retrieved = getProofsForMint('test-mint')
    expect(retrieved).toHaveLength(1)
    expect(retrieved[0].amount).toBe(100)

    Storage.prototype.setItem = originalSetItem
  })
})
