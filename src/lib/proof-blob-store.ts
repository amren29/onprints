/**
 * IndexedDB blob store for proof file data.
 * Stores large base64 data URLs outside localStorage to avoid quota issues.
 */

const DB_NAME = 'sp-proof-blobs'
const DB_VERSION = 1
const STORE_NAME = 'blobs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function storeBlob(key: string, data: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(data, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Silently fail — proof page will show file name without preview
  }
}

export async function getBlob(key: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function deleteBlob(key: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

/** Store multiple blobs and return a map of key → blobRef */
export async function storeBlobBatch(entries: { key: string; data: string }[]): Promise<void> {
  if (entries.length === 0) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      for (const { key, data } of entries) {
        store.put(data, key)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

/** Retrieve multiple blobs by keys */
export async function getBlobBatch(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {}
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const result: Record<string, string> = {}
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      let pending = keys.length
      for (const key of keys) {
        const req = store.get(key)
        req.onsuccess = () => {
          if (req.result) result[key] = req.result
          if (--pending === 0) resolve(result)
        }
        req.onerror = () => {
          if (--pending === 0) resolve(result)
        }
      }
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return {}
  }
}
