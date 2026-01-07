// Browser compatibility checks
export function checkBrowserSupport() {
  const features = {
    localStorage: checkLocalStorage(),
    crypto: checkCrypto(),
    bigInt: checkBigInt(),
    textEncoder: checkTextEncoder(),
    webCrypto: checkWebCrypto()
  }

  const missingFeatures = Object.entries(features)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature)

  return {
    isSupported: missingFeatures.length === 0,
    features,
    missingFeatures
  }
}

function checkLocalStorage() {
  try {
    const test = '__test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

function checkCrypto() {
  return typeof window !== 'undefined' &&
         window.crypto !== undefined
}

function checkBigInt() {
  try {
    BigInt(1)
    return true
  } catch (e) {
    return false
  }
}

function checkTextEncoder() {
  return typeof TextEncoder !== 'undefined' &&
         typeof TextDecoder !== 'undefined'
}

function checkWebCrypto() {
  return typeof window !== 'undefined' &&
         window.crypto !== undefined &&
         window.crypto.subtle !== undefined
}

export function detectStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return navigator.storage.estimate()
      .then(({ usage, quota }) => ({
        usage,
        quota,
        available: quota - usage,
        percentUsed: Math.round((usage / quota) * 100)
      }))
      .catch(() => null)
  }
  return Promise.resolve(null)
}

export function getStorageInfo() {
  try {
    let totalSize = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length
      }
    }
    return {
      itemCount: localStorage.length,
      estimatedSize: totalSize,
      estimatedSizeKB: Math.round(totalSize / 1024)
    }
  } catch (e) {
    return null
  }
}
