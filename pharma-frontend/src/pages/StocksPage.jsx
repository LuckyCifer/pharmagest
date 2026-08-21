import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, ArrowUpCircle, ArrowDownCircle, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { stockService, medicamentService } from '../services/api'
import { useLang } from '../context/LangContext'
import { usePermissions } from '../hooks/usePermissions'
import { formatDateTime } from '../utils/formatters'
import Pagination from '../components/Pagination'

const TYPE_COLORS = {
  entree: 'badge-success', sortie: 'badge-danger',
  ajustement: 'badge-info', retour: 'badge-warning', perte: 'badge-gray',
}

export default function StocksPage() {
  const { t, lang } = useLang()
  const { canAddMovement, canViewAlerts } = usePermissions()
  const [mouvements, setMouvements] = useState([])
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ medicament: '', type_mouvement: 'entree', quantite: '', motif: '', reference: '' })
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)

  const load = () => {
    setLoading(true)
    Promise.all([stockService.mouvements({ page }), medicamentService.lister({ page_size: 500 })])
      .then(([r1, r2]) => {
        setMouvements(r1.data.results ?? r1.data)
        setCount(r1.data.count ?? (r1.data.results ?? r1.data).length)
        setMeds(r2.data.results ?? r2.data)
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const handleSave = async () => {
    if (!form.medicament || !form.quantite) return toast.error(t('stocks.toastRequiredFields'))
    setSaving(true)
    try {
      await stockService.creerMouvement({ ...form, quantite: parseInt(form.quantite) })
      toast.success(t('stocks.toastSaved'))
      setModal(false)
      setForm({ medicament: '', type_mouvement: 'entree', quantite: '', motif: '', reference: '' })
      load()
    } catch { toast.error(t('common.error')) }
    finally { setSaving(false) }
  }

  const types = [
    { value: 'entree', label: t('stocks.entry') },
    { value: 'sortie', label: t('stocks.exit') },
    { value: 'ajustement', label: t('stocks.adjustment') },
    { value: 'retour', label: t('stocks.return') },
    { value: 'perte', label: t('stocks.loss') },
  ]

  const isEntree = (type) => type === 'entree' || type === 'retour'
  const typeLabel = (v) => types.find(tp => tp.value === v)?.label || v
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('stocks.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('stocks.subtitle')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {canViewAlerts && (
            <Link to="/registre-dpml" className="btn-secondary flex items-center gap-1.5">
              <ShieldAlert size={15} />
              <span className="hidden sm:inline">{t('registre.title')}</span>
            </Link>
          )}
          {canAddMovement && <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} />
            <span className="hidden sm:inline">{t('stocks.addMovement')}</span>
            <span className="sm:hidden">{t('stocks.movementShort')}</span>
          </button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : mouvements.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">{t('stocks.noResults')}</div>
        ) : (
          <>
            {/* Vue mobile — cartes */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {mouvements.map(m => (
                <div key={m.id} className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${isEntree(m.type_mouvement) ? 'text-green-500' : 'text-red-400'}`}>
                    {isEntree(m.type_mouvement) ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{m.medicament_nom}</span>
                      <span className={TYPE_COLORS[m.type_mouvement] || 'badge-gray'}>{typeLabel(m.type_mouvement)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(m.date_mouvement, lang)}</div>
                    {m.motif && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{m.motif}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-mono font-bold text-sm ${isEntree(m.type_mouvement) ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {isEntree(m.type_mouvement) ? '+' : '-'}{m.quantite}
                    </div>
                    <div className="text-xs text-gray-400">{m.quantite_avant} → {m.quantite_apres}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vue desktop — tableau */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="th">{t('stocks.date')}</th>
                    <th className="th">{t('stocks.medication')}</th>
                    <th className="th">{t('stocks.type')}</th>
                    <th className="th text-right">{t('stocks.qty')}</th>
                    <th className="th text-right">{t('stocks.before')}</th>
                    <th className="th text-right">{t('stocks.after')}</th>
                    <th className="th">{t('stocks.reason')}</th>
                    <th className="th">{t('stocks.user')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map(m => (
                    <tr key={m.id} className="tr">
                      <td className="td text-xs">{formatDateTime(m.date_mouvement, lang)}</td>
                      <td className="td font-medium">{m.medicament_nom}</td>
                      <td className="td">
                        <span className={TYPE_COLORS[m.type_mouvement] || 'badge-gray'}>{typeLabel(m.type_mouvement)}</span>
                      </td>
                      <td className="td text-right font-mono">{m.quantite}</td>
                      <td className="td text-right text-gray-500 font-mono">{m.quantite_avant}</td>
                      <td className="td text-right font-mono font-medium">{m.quantite_apres}</td>
                      <td className="td text-xs text-gray-500 max-w-40 truncate">{m.motif || '—'}</td>
                      <td className="td text-xs">{m.utilisateur_nom || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} setPage={setPage} count={count} />
      </div>

      {/* Modal — bottom sheet mobile, centré desktop */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('stocks.addTitle')}</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('stocks.medication')}</label>
                <select className="input" value={form.medicament} onChange={e => f('medicament', e.target.value)}>
                  <option value="">{t('stocks.selectPlaceholder')}</option>
                  {meds.map(m => <option key={m.id} value={m.id}>{m.nom} {m.dosage && `(${m.dosage})`} — {t('stocks.stockWord')}: {m.quantite_stock}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('stocks.type')}</label>
                <select className="input" value={form.type_mouvement} onChange={e => f('type_mouvement', e.target.value)}>
                  {types.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('stocks.qty')}</label>
                <input type="number" min="1" className="input" value={form.quantite} onChange={e => f('quantite', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('stocks.reason')}</label>
                <input className="input" value={form.motif} onChange={e => f('motif', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('stocks.ref')}</label>
                <input className="input" value={form.reference} onChange={e => f('reference', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('stocks.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : t('stocks.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
