// Petite couche IndexedDB dédiée au mode hors ligne : file d'attente des ventes
// non synchronisées, et cache de secours du catalogue de médicaments.
// Pas de dépendance externe (pas de librairie type "idb") — le besoin est
// suffisamment restreint (2 stores, quelques opérations) pour un wrapper maison.

const DB_NAME = 'pharmagest_offline'
const DB_VERSION = 1
const STORE_QUEUE = 'queued_sales'
const STORE_MEDS = 'medicament_cache'
const STORE_META = 'meta'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'localId' })
      }
      if (!db.objectStoreNames.contains(STORE_MEDS)) {
        db.createObjectStore(STORE_MEDS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(storeName, mode) {
  return openDb().then(db => db.transaction(storeName, mode).objectStore(storeName))
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ---- File d'attente des ventes hors ligne ----

export async function addQueuedSale(record) {
  const store = await tx(STORE_QUEUE, 'readwrite')
  await wrap(store.put(record))
  return record
}

export async function getQueuedSales() {
  const store = await tx(STORE_QUEUE, 'readonly')
  const all = await wrap(store.getAll())
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateQueuedSale(record) {
  const store = await tx(STORE_QUEUE, 'readwrite')
  await wrap(store.put(record))
}

export async function removeQueuedSale(localId) {
  const store = await tx(STORE_QUEUE, 'readwrite')
  await wrap(store.delete(localId))
}

// ---- Cache de secours du catalogue de médicaments ----

export async function cacheMedicaments(list) {
  const store = await tx(STORE_MEDS, 'readwrite')
  await Promise.all(list.map(m => wrap(store.put(m))))
  const metaStore = await tx(STORE_META, 'readwrite')
  await wrap(metaStore.put({ key: 'medicaments_synced_at', value: new Date().toISOString() }))
}

export async function getCachedMedicaments() {
  const store = await tx(STORE_MEDS, 'readonly')
  return wrap(store.getAll())
}
