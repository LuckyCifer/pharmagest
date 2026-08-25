import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { venteService } from '../services/api'
import {
  addQueuedSale, getQueuedSales, updateQueuedSale, removeQueuedSale,
} from '../offline/db'

const OfflineContext = createContext(null)

// Une requête réseau qui n'obtient aucune réponse (hors ligne, DNS, serveur
// injoignable) laisse error.response vide côté axios — à l'inverse d'une
// erreur métier (400/403/404...) où le serveur a bien répondu.
function isNetworkError(error) {
  return !error?.response
}

function genLocalId() {
  return 'HL-' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10))
}

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSales, setPendingSales] = useState([])
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)

  const refreshPending = useCallback(async () => {
    const all = await getQueuedSales()
    setPendingSales(all)
    return all
  }, [])

  useEffect(() => { refreshPending() }, [refreshPending])

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const queue = await getQueuedSales()
      for (const record of queue) {
        try {
          const res = await venteService.creer(record.payload)
          if (record.scanFile) {
            try { await venteService.uploadOrdonnanceScan(res.data.id, record.scanFile) }
            catch { /* le scan pourra être rejoint manuellement depuis la vente une fois en ligne */ }
          }
          await removeQueuedSale(record.localId)
        } catch (err) {
          if (isNetworkError(err)) {
            // Toujours hors ligne (ou serveur injoignable) : inutile de continuer la file,
            // on retentera au prochain passage en ligne.
            break
          }
          // Erreur métier (ex: stock insuffisant devenu réel entre-temps) : on garde
          // l'entrée en file, marquée en erreur, et on continue avec les suivantes.
          const detail = err.response?.data
          const message = detail?.error_code === 'insufficient_stock'
            ? `${detail.medicament} — stock insuffisant (${detail.disponible} disponible)`
            : (detail?.detail || detail?.[0] || 'Erreur de synchronisation')
          await updateQueuedSale({ ...record, status: 'error', errorMessage: message })
        }
      }
    } finally {
      await refreshPending()
      syncingRef.current = false
      setSyncing(false)
    }
  }, [refreshPending])

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); syncNow() }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    if (navigator.onLine) syncNow()
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const queueSale = useCallback(async (payload, scanFile, computedTotals) => {
    const localId = genLocalId()
    const record = {
      localId,
      payload,
      scanFile: scanFile || null,
      scanFileName: scanFile?.name || null,
      createdAt: new Date().toISOString(),
      status: 'pending',
      errorMessage: null,
      computedTotals,
    }
    await addQueuedSale(record)
    await refreshPending()
    return record
  }, [refreshPending])

  const discardQueuedSale = useCallback(async (localId) => {
    await removeQueuedSale(localId)
    await refreshPending()
  }, [refreshPending])

  // Quantité déjà réservée par des ventes hors ligne non encore synchronisées,
  // par médicament — pour ne pas revendre deux fois la dernière unité en rayon
  // avant que le stock serveur ne soit réellement décrémenté.
  const offlineReserved = pendingSales.reduce((acc, rec) => {
    for (const l of rec.payload.lignes || []) {
      acc[l.medicament] = (acc[l.medicament] || 0) + l.quantite
    }
    return acc
  }, {})

  return (
    <OfflineContext.Provider value={{
      isOnline, pendingSales, syncing, syncNow, queueSale, discardQueuedSale, offlineReserved,
    }}>
      {children}
    </OfflineContext.Provider>
  )
}

export const useOffline = () => useContext(OfflineContext)
export { isNetworkError }
