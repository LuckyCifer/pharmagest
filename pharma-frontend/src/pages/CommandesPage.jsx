import { useEffect, useState } from 'react'
import { Plus, X, Trash2, PackageCheck, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import { commandeService, medicamentService } from '../services/api'
import { useLang } from '../context/LangContext'
import { usePermissions } from '../hooks/usePermissions'
import { formatFCFA, formatDate } from '../utils/formatters'
import Pagination from '../components/Pagination'
import ConfirmModal from '../components/ConfirmModal'

const STATUT_BADGE = { envoyee: 'badge-info', recue_partielle: 'badge-warning', recue: 'badge-success', annulee: 'badge-gray' }

const emptyForm = { fournisseur: '', observations: '', lignes: [] }

export default function CommandesPage() {
  const { t, lang } = useLang()
  const { canManageCommandes, canDeleteCommande } = usePermissions()
  const [commandes, setCommandes] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [receiveTarget, setReceiveTarget] = useState(null)
  const [receiveLines, setReceiveLines] = useState({})
  const [receiveRef, setReceiveRef] = useState('')
  const [receiving, setReceiving] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const STATUT_LABEL = { envoyee: t('commandes.envoyee'), recue_partielle: t('commandes.recuePartielle'), recue: t('commandes.recue'), annulee: t('commandes.annulee') }

  const load = () => {
    setLoading(true)
    Promise.all([
      commandeService.lister({ page }),
      medicamentService.fournisseurs({ page_size: 500 }),
      medicamentService.lister({ page_size: 500 }),
    ]).then(([r1, r2, r3]) => {
      setCommandes(r1.data.results ?? r1.data)
      setCount(r1.data.count ?? (r1.data.results ?? r1.data).length)
      setFournisseurs(r2.data.results ?? r2.data)
      setMeds(r3.data.results ?? r3.data)
    }).catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const openAdd = () => { setForm(emptyForm); setSuggestions([]); setModal(true) }

  const loadSuggestions = (fournisseurId) => {
    if (!fournisseurId) { setSuggestions([]); return }
    commandeService.suggestions({ fournisseur: fournisseurId })
      .then(r => setSuggestions(r.data))
      .catch(() => {})
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const addLigne = () => setForm(p => ({ ...p, lignes: [...p.lignes, { medicament: '', quantite_commandee: 1, prix_unitaire: '' }] }))
  const removeLigne = (i) => setForm(p => ({ ...p, lignes: p.lignes.filter((_, idx) => idx !== i) }))
  const updateLigne = (i, k, v) => setForm(p => ({ ...p, lignes: p.lignes.map((l, idx) => idx === i ? { ...l, [k]: v } : l) }))

  const updateMedicament = (i, medId) => {
    const med = meds.find(m => String(m.id) === String(medId))
    setForm(p => ({
      ...p,
      lignes: p.lignes.map((l, idx) => idx === i ? { ...l, medicament: medId, prix_unitaire: med ? med.prix_achat : l.prix_unitaire } : l)
    }))
  }

  const addSuggestion = (sug) => {
    setForm(p => {
      if (p.lignes.some(l => String(l.medicament) === String(sug.id))) return p
      return { ...p, lignes: [...p.lignes, { medicament: sug.id, quantite_commandee: sug.quantite_suggeree, prix_unitaire: sug.prix_achat }] }
    })
  }
  const addAllSuggestions = () => suggestions.forEach(addSuggestion)

  const calcTotal = () => form.lignes.reduce((acc, l) => acc + (parseInt(l.quantite_commandee) || 0) * (parseFloat(l.prix_unitaire) || 0), 0)

  const handleSave = async () => {
    if (form.lignes.length === 0) return toast.error(t('commandes.toastNoLine'))
    setSaving(true)
    try {
      await commandeService.creer({
        ...form,
        lignes: form.lignes.map(l => ({
          medicament: parseInt(l.medicament),
          quantite_commandee: parseInt(l.quantite_commandee),
          prix_unitaire: parseFloat(l.prix_unitaire) || 0,
        })),
      })
      toast.success(t('commandes.toastSaved'))
      setModal(false)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || t('common.error'))
    } finally { setSaving(false) }
  }

  const openReceive = (commande) => {
    setReceiveTarget(commande)
    setReceiveRef(commande.reference_livraison || '')
    const initial = {}
    commande.lignes.forEach(l => {
      initial[l.id] = { quantite_recue: l.quantite_commandee, numero_lot: '', date_peremption: '' }
    })
    setReceiveLines(initial)
  }

  const updateReceiveLine = (ligneId, k, v) => {
    setReceiveLines(p => ({ ...p, [ligneId]: { ...p[ligneId], [k]: v } }))
  }

  const handleReceive = async () => {
    const lignes = Object.entries(receiveLines)
      .map(([id, v]) => ({ id: parseInt(id), quantite_recue: parseInt(v.quantite_recue) || 0, numero_lot: v.numero_lot, date_peremption: v.date_peremption || null, prix_unitaire: undefined }))
      .filter(l => l.quantite_recue > 0)
    if (lignes.length === 0) return toast.error(t('commandes.toastQtyRequired'))
    setReceiving(true)
    try {
      await commandeService.recevoir(receiveTarget.id, { reference_livraison: receiveRef, lignes })
      toast.success(t('commandes.toastReceived'))
      setReceiveTarget(null)
      load()
    } catch (e) {
      toast.error(e.response?.data?.error || t('common.error'))
    } finally { setReceiving(false) }
  }

  const handleCancel = async () => {
    try {
      await commandeService.annuler(cancelTarget.id)
      toast.success(t('commandes.toastCancelled'))
      setCancelTarget(null)
      load()
    } catch { toast.error(t('common.error')) }
  }

  const handleDelete = async () => {
    try {
      await commandeService.supprimer(deleteTarget.id)
      toast.success(t('commandes.toastDeleted'))
      setDeleteTarget(null)
      load()
    } catch { toast.error(t('common.error')) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('commandes.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('commandes.subtitle')}</p>
        </div>
        {canManageCommandes && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 shrink-0">
            <Plus size={16} />
            <span className="hidden sm:inline">{t('commandes.add')}</span>
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : commandes.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">{t('commandes.noResults')}</div>
        ) : (
          <>
            {/* Vue mobile — cartes */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {commandes.map(c => (
                <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-medium text-sm text-gray-900 dark:text-white">{c.reference}</span>
                      <span className={STATUT_BADGE[c.statut] || 'badge-gray'}>{STATUT_LABEL[c.statut] || c.statut}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.fournisseur_nom}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDate(c.date_creation, lang)}</div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {canManageCommandes && c.statut === 'envoyee' && (
                      <>
                        <button onClick={() => openReceive(c)} className="p-2 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <PackageCheck size={15} />
                        </button>
                        <button onClick={() => setCancelTarget(c)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                          <Ban size={15} />
                        </button>
                      </>
                    )}
                    {canDeleteCommande && (
                      <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Vue desktop — tableau */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="th">{t('commandes.reference')}</th>
                    <th className="th">{t('commandes.supplier')}</th>
                    <th className="th">{t('commandes.date')}</th>
                    <th className="th">{t('commandes.status')}</th>
                    <th className="th">{t('commandes.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {commandes.map(c => (
                    <tr key={c.id} className="tr">
                      <td className="td font-mono font-medium">{c.reference}</td>
                      <td className="td">{c.fournisseur_nom}</td>
                      <td className="td text-xs">{formatDate(c.date_creation, lang)}</td>
                      <td className="td"><span className={STATUT_BADGE[c.statut] || 'badge-gray'}>{STATUT_LABEL[c.statut] || c.statut}</span></td>
                      <td className="td">
                        <div className="flex items-center gap-1">
                          {canManageCommandes && c.statut === 'envoyee' && (
                            <>
                              <button onClick={() => openReceive(c)} className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-colors" title={t('commandes.receive')}>
                                <PackageCheck size={14} />
                              </button>
                              <button onClick={() => setCancelTarget(c)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title={t('commandes.cancelOrder')}>
                                <Ban size={14} />
                              </button>
                            </>
                          )}
                          {canDeleteCommande && (
                            <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} setPage={setPage} count={count} />
      </div>

      <ConfirmModal
        open={!!cancelTarget}
        title={t('commandes.cancelConfirmTitle')}
        message={cancelTarget ? t('commandes.cancelConfirmMessage', { reference: cancelTarget.reference }) : ''}
        confirmLabel={t('commandes.cancelOrder')}
        danger={false}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title={t('commandes.deleteTitle')}
        message={deleteTarget ? t('commandes.deleteMessage', { reference: deleteTarget.reference }) : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modale nouvelle commande */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('commandes.addTitle')}</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('commandes.supplier')}</label>
                <select className="input" value={form.fournisseur} onChange={e => { f('fournisseur', e.target.value); loadSuggestions(e.target.value) }}>
                  <option value="">{t('commandes.selectSupplier')}</option>
                  {fournisseurs.map(fo => <option key={fo.id} value={fo.id}>{fo.nom}</option>)}
                </select>
              </div>

              {form.fournisseur && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">{t('commandes.suggestions')}</span>
                    {suggestions.length > 0 && (
                      <button onClick={addAllSuggestions} className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 font-medium">{t('commandes.addAllSuggestions')}</button>
                    )}
                  </div>
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('commandes.noSuggestions')}</p>
                  ) : (
                    <div className="space-y-1">
                      {suggestions.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
                          <span className="text-gray-700 dark:text-gray-300">{s.nom} — {t('commandes.qtyOrdered')}: {s.quantite_suggeree}</span>
                          <button onClick={() => addSuggestion(s)} className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium">{t('commandes.addSuggestion')}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('commandes.lines')}</label>
                  <button onClick={addLigne} className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1 font-medium">
                    <Plus size={13} /> {t('commandes.addLine')}
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lignes.map((l, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-2">
                      <select className="input flex-1 text-sm" value={l.medicament} onChange={e => updateMedicament(i, e.target.value)}>
                        <option value="">{t('commandes.selectMedication')}</option>
                        {meds.map(m => <option key={m.id} value={m.id}>{m.nom}{m.dosage ? ` (${m.dosage})` : ''}</option>)}
                      </select>
                      <div className="flex gap-2 items-center">
                        <input type="number" min="1" className="input w-20 text-center text-sm" value={l.quantite_commandee} onChange={e => updateLigne(i, 'quantite_commandee', e.target.value)} />
                        <input type="number" min="0" className="input w-24 text-center text-sm" value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} placeholder={t('commandes.unitPrice')} />
                        <button onClick={() => removeLigne(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {form.lignes.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      {t('commandes.toastNoLine')}
                    </div>
                  )}
                </div>
              </div>

              {form.lignes.length > 0 && (
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('commandes.total')}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{formatFCFA(calcTotal(), lang)}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('commandes.observations')}</label>
                <textarea className="input resize-none" rows={2} value={form.observations} onChange={e => f('observations', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('commandes.cancel')}</button>
              <button onClick={handleSave} disabled={saving || form.lignes.length === 0} className="btn-primary flex-1">
                {saving ? <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : t('commandes.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale réception */}
      {receiveTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('commandes.receiveTitle')} — {receiveTarget.reference}</h3>
              <button onClick={() => setReceiveTarget(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('commandes.deliveryRef')}</label>
                <input className="input" value={receiveRef} onChange={e => setReceiveRef(e.target.value)} />
              </div>
              <div className="space-y-3">
                {receiveTarget.lignes.map(l => (
                  <div key={l.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{l.medicament_nom}</span>
                      <span className="text-xs text-gray-400">{t('commandes.qtyOrdered')}: {l.quantite_commandee}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('commandes.qtyReceived')}</label>
                        <input type="number" min="0" className="input text-sm" value={receiveLines[l.id]?.quantite_recue ?? ''} onChange={e => updateReceiveLine(l.id, 'quantite_recue', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('commandes.lot')}</label>
                        <input className="input text-sm" value={receiveLines[l.id]?.numero_lot ?? ''} onChange={e => updateReceiveLine(l.id, 'numero_lot', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('commandes.expiry')}</label>
                        <input type="date" className="input text-sm" value={receiveLines[l.id]?.date_peremption ?? ''} onChange={e => updateReceiveLine(l.id, 'date_peremption', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={() => setReceiveTarget(null)} className="btn-secondary flex-1">{t('commandes.cancel')}</button>
              <button onClick={handleReceive} disabled={receiving} className="btn-primary flex-1">
                {receiving ? <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : t('commandes.receive')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
