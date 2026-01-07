import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkBrowserSupport, detectStorageQuota, getStorageInfo } from '../utils/compatibility'

describe('Browser Compatibility', () => {
  describe('checkBrowserSupport', () => {
    it('detects localStorage support', () => {
      const result = checkBrowserSupport()
      expect(result.features.localStorage).toBe(true)
    })

    it('detects crypto support', () => {
      const result = checkBrowserSupport()
      expect(result.features.crypto).toBeDefined()
    })

    it('detects BigInt support', () => {
      const result = checkBrowserSupport()
      expect(result.features.bigInt).toBeDefined()
    })

    it('returns unsupported when BigInt is missing', () => {
      const originalBigInt = global.BigInt
      global.BigInt = undefined

      const result = checkBrowserSupport()
      expect(result.isSupported).toBe(false)
      expect(result.missingFeatures).toContain('bigInt')

      global.BigInt = originalBigInt
    })
  })

  describe('getStorageInfo', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('returns storage info', () => {
      localStorage.setItem('test', 'data')
      const info = getStorageInfo()

      expect(info).toBeDefined()
      expect(info.itemCount).toBeGreaterThan(0)
      expect(info.estimatedSize).toBeGreaterThan(0)
    })
  })
})
