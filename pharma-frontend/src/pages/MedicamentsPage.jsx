import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { medicamentService } from '../services/api'
import { useLang } from '../context/LangContext'
import { usePermissions } from '../hooks/usePermissions'
import { formatFCFA, formatDate, statutStockBadge, statutPeremptionBadge } from '../utils/formatters'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'

const FORMES = ['comprime','sirop','injectable','capsule','pommade','autre']

const emptyForm = {
  nom:'', denomination_commune:'', forme:'comprime', type_produit:'medicament', dosage:'', categorie:'', fournisseur:'',
  numero_lot:'', date_fabrication:'', date_peremption:'',
  prix_achat:'', prix_vente:'', quantite_stock:0, seuil_alerte:10, description:''
}

export default function MedicamentsPage() {
  const { t, lang } = useLang()
  const FORMES_LABELS = {
    comprime: t('medications.formes.comprime'), sirop: t('medications.formes.sirop'),
    injectable: t('medications.formes.injectable'), capsule: t('medications.formes.capsule'),
    pommade: t('medications.formes.pommade'), autre: t('medications.formes.autre'),
  }
  const { canEditMeds, canDeleteMeds } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [meds, setMeds] = useState([])
  const [categories, setCategories] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterForme, setFilterForme] = useState('')
  const [filterStatut, setFilterStatut] = useState(() => searchParams.get('statut') || '')
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)

  const load = () => {
    setLoading(true)
    Promise.all([
      medicamentService.lister({ search, statut_stock: filterStatut || undefined, forme: filterForme || undefined, page }),
      medicamentService.categories({ page_size: 500 }),
      medicamentService.fournisseurs({ page_size: 500 }),
    ]).then(([r1, r2, r3]) => {
      setMeds(r1.data.results ?? r1.data)
      setCount(r1.data.count ?? (r1.data.results ?? r1.data).length)
      setCategories(r2.data.results ?? r2.data)
      setFournisseurs(r3.data.results ?? r3.data)
    }).catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, filterForme, filterStatut, page])
  useEffect(() => { setPage(1) }, [search, filterForme, filterStatut])

  const openAdd = () => { setForm(emptyForm); setModal('add') }
  const openEdit = (m) => {
    setForm({
      nom: m.nom, denomination_commune: m.denomination_commune || '', forme: m.forme,
      type_produit: m.type_produit || 'medicament',
      dosage: m.dosage || '', categorie: m.categorie || '', fournisseur: m.fournisseur || '',
      numero_lot: m.numero_lot || '', date_fabrication: m.date_fabrication || '',
      date_peremption: m.date_peremption || '', prix_achat: m.prix_achat,
      prix_vente: m.prix_vente, quantite_stock: m.quantite_stock,
      seuil_alerte: m.seuil_alerte, description: m.description || '',
      _id: m.id,
    })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.nom || !form.prix_vente || !form.prix_achat) return toast.error(t('medications.toastNameRequired'))
    setSaving(true)
    try {
      if (modal === 'add') await medicamentService.creer(form)
      else await medicamentService.modifier(form._id, form)
      toast.success(modal === 'add' ? t('medications.toastAdded') : t('medications.toastEdited'))
      setModal(null); load()
    } catch { toast.error(t('common.error')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await medicamentService.supprimer(deleteTarget.id)
      toast.success(t('medications.toastDeleted'))
      setDeleteTarget(null)
      load()
    } catch { toast.error(t('common.error')) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('medications.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('medications.subtitle')}</p>
        </div>
        {canEditMeds && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 shrink-0">
            <Plus size={16} />
            <span className="hidden xs:inline sm:inline">{t('medications.add')}</span>
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="card p-3 sm:p-4 flex flex-wrap gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0" style={{ minWidth: '160px' }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder={t('medications.search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto text-sm" value={filterForme} onChange={e => setFilterForme(e.target.value)}>
          <option value="">{t('medications.allForms')}</option>
          {FORMES.map(fo => <option key={fo} value={fo}>{FORMES_LABELS[fo]}</option>)}
        </select>
        <select className="input w-auto text-sm" value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setSearchParams({}) }}>
          <option value="">{t('medications.allStatuses')}</option>
          <option value="normal">{t('medications.normal')}</option>
          <option value="critique">{t('medications.critique')}</option>
          <option value="rupture">{t('medications.rupture')}</option>
        </select>
      </div>

      {/* Contenu */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : meds.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">{t('medications.noResults')}</div>
        ) : (
          <>
            {/* Vue mobile — cartes */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {meds.map(m => {
                const sb = statutStockBadge(m.statut_stock, t)
                const pb = statutPeremptionBadge(m.statut_peremption, t)
                return (
                  <div key={m.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{m.nom}</span>
                        <span className={sb.class}>{sb.label}</span>
                        {m.type_produit === 'parapharmacie' && <span className="badge-info">{t('medications.typeParapharmacie')}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {FORMES_LABELS[m.forme]}{m.dosage ? ` · ${m.dosage}` : ''}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('medications.stock')} : <strong className="text-gray-900 dark:text-white">{m.quantite_stock}</strong>
                        </span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatFCFA(m.prix_vente, lang)}</span>
                        {m.date_peremption && <span className={pb.class}>{pb.label}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {canEditMeds && (
                        <button onClick={() => openEdit(m)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {canDeleteMeds && (
                        <button onClick={() => setDeleteTarget(m)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Vue desktop — tableau */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="th">{t('medications.name')}</th>
                    <th className="th">{t('medications.form')}</th>
                    <th className="th">{t('medications.category')}</th>
                    <th className="th text-right">{t('medications.stock')}</th>
                    <th className="th">{t('medications.expiry')}</th>
                    <th className="th text-right">{t('medications.price')}</th>
                    <th className="th">{t('medications.status')}</th>
                    <th className="th">{t('medications.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {meds.map(m => {
                    const sb = statutStockBadge(m.statut_stock, t)
                    const pb = statutPeremptionBadge(m.statut_peremption, t)
                    return (
                      <tr key={m.id} className="tr">
                        <td className="td">
                          <div className="font-medium flex items-center gap-2">
                            {m.nom}
                            {m.type_produit === 'parapharmacie' && <span className="badge-info">{t('medications.typeParapharmacie')}</span>}
                          </div>
                          {m.dosage && <div className="text-xs text-gray-400">{m.dosage}</div>}
                        </td>
                        <td className="td">{FORMES_LABELS[m.forme] || m.forme}</td>
                        <td className="td">{m.categorie_nom || '—'}</td>
                        <td className="td text-right font-medium">{m.quantite_stock}</td>
                        <td className="td">
                          <div className="text-xs">{formatDate(m.date_peremption, lang)}</div>
                          <span className={pb.class}>{pb.label}</span>
                        </td>
                        <td className="td text-right">{formatFCFA(m.prix_vente, lang)}</td>
                        <td className="td"><span className={sb.class}>{sb.label}</span></td>
                        <td className="td">
                          <div className="flex items-center gap-1">
                            {canEditMeds && (
                              <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDeleteMeds && (
                              <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} setPage={setPage} count={count} />
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title={t('medications.deleteTitle')}
        message={deleteTarget ? t('medications.deleteMessage', { nom: deleteTarget.nom }) : ''}
        confirmLabel={t('medications.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal — bottom sheet mobile, centré desktop */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {modal === 'add' ? t('medications.addTitle') : t('medications.editTitle')}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['nom', t('medications.name')], ['denomination_commune', t('medications.generic')],
                ['dosage', t('medications.dosage')], ['numero_lot', t('medications.lot')],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lbl}</label>
                  <input className="input" value={form[k]} onChange={e => f(k, e.target.value)} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('medications.form')}</label>
                <select className="input" value={form.forme} onChange={e => f('forme', e.target.value)}>
                  {FORMES.map(fo => <option key={fo} value={fo}>{FORMES_LABELS[fo]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('medications.typeProduit')}</label>
                <select className="input" value={form.type_produit} onChange={e => f('type_produit', e.target.value)}>
                  <option value="medicament">{t('medications.typeMedicament')}</option>
                  <option value="parapharmacie">{t('medications.typeParapharmacie')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('medications.category')}</label>
                <select className="input" value={form.categorie} onChange={e => f('categorie', e.target.value)}>
                  <option value="">—</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('medications.supplier')}</label>
                <select className="input" value={form.fournisseur} onChange={e => f('fournisseur', e.target.value)}>
                  <option value="">—</option>
                  {fournisseurs.map(fo => <option key={fo.id} value={fo.id}>{fo.nom}</option>)}
                </select>
              </div>
              {[
                ['prix_achat', t('medications.purchasePrice')], ['prix_vente', t('medications.price')],
                ['quantite_stock', t('medications.stock')], ['seuil_alerte', t('medications.threshold')],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lbl}</label>
                  <input type="number" className="input" value={form[k]} onChange={e => f(k, e.target.value)} />
                </div>
              ))}
              {[
                ['date_fabrication', t('medications.mfgDate')], ['date_peremption', t('medications.expiry')],
              ].map(([k, lbl]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{lbl}</label>
                  <input type="date" className="input" value={form[k]} onChange={e => f(k, e.target.value)} />
                </div>
              ))}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('medications.description')}</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => f('description', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={() => setModal(null)} className="btn-secondary">{t('medications.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary min-w-24">
                {saving ? <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : t('medications.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
