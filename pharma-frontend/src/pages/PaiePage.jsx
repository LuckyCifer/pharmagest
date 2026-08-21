import { useEffect, useState } from 'react'
import { Plus, X, Printer, CheckCircle, Trash2, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { paieService, userService } from '../services/api'
import { useLang } from '../context/LangContext'
import { usePermissions } from '../hooks/usePermissions'
import { formatFCFA, formatDateTime, statutPaieBadge } from '../utils/formatters'
import ConfirmModal from '../components/ConfirmModal'
import PayslipModal from '../components/PayslipModal'
import Pagination from '../components/Pagination'

const emptyForm = {
  employe: '', mois: new Date().getMonth() + 1, annee: new Date().getFullYear(),
  salaire_base: '', primes: 0, deductions: 0, mode_paiement: 'mobile_money', observations: '',
}

export default function PaiePage() {
  const { t, lang } = useLang()
  const { canManagePaie, canDeletePaie } = usePermissions()
  const [fiches, setFiches] = useState([])
  const [employes, setEmployes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterMois, setFilterMois] = useState('')
  const [filterAnnee, setFilterAnnee] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [payslip, setPayslip] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [marking, setMarking] = useState(null)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)

  const load = () => {
    setLoading(true)
    Promise.all([
      paieService.lister({ mois: filterMois || undefined, annee: filterAnnee || undefined, page }),
      userService.lister({ page_size: 500 }),
    ]).then(([r1, r2]) => {
      setFiches(r1.data.results ?? r1.data)
      setCount(r1.data.count ?? (r1.data.results ?? r1.data).length)
      setEmployes(r2.data.results ?? r2.data)
    }).catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterMois, filterAnnee, page])
  useEffect(() => { setPage(1) }, [filterMois, filterAnnee])

  const openAdd = () => { setForm(emptyForm); setModal('add') }
  const openEdit = (f) => {
    setForm({
      employe: f.employe, mois: f.mois, annee: f.annee,
      salaire_base: f.salaire_base, primes: f.primes, deductions: f.deductions,
      mode_paiement: f.mode_paiement, observations: f.observations || '',
      _id: f.id,
    })
    setModal('edit')
  }

  const field = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleEmployeChange = (id) => {
    field('employe', id)
    if (modal === 'add') {
      const dernieres = fiches.filter(f => String(f.employe) === String(id))
      if (dernieres.length > 0) field('salaire_base', dernieres[0].salaire_base)
    }
  }

  const handleSave = async () => {
    if (!form.employe || !form.salaire_base) return toast.error(t('paie.toastRequiredFields'))
    setSaving(true)
    try {
      if (modal === 'add') await paieService.creer(form)
      else await paieService.modifier(form._id, form)
      toast.success(t('paie.toastSaved'))
      setModal(null); load()
    } catch (e) {
      const msg = e.response?.data
      const text = msg && typeof msg === 'object'
        ? Object.values(msg).flat().join(' · ')
        : t('common.error')
      toast.error(text)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await paieService.supprimer(deleteTarget.id)
      toast.success(t('paie.toastDeleted'))
      setDeleteTarget(null)
      load()
    } catch { toast.error(t('common.error')) }
  }

  const handleMarkPaid = async (f) => {
    setMarking(f.id)
    try {
      await paieService.marquerPayee(f.id)
      toast.success(t('paie.toastMarkedPaid'))
      load()
    } catch { toast.error(t('common.error')) }
    finally { setMarking(null) }
  }

  const paymentLabels = { especes: t('paie.cash'), mobile_money: t('paie.mobile'), virement: t('paie.transfer') }
  const months = t('paie.months')
  const periode = (f) => `${months[f.mois - 1]} ${f.annee}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('paie.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('paie.subtitle')}</p>
        </div>
        {canManagePaie && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 shrink-0">
            <Plus size={16} />
            <span className="hidden sm:inline">{t('paie.add')}</span>
          </button>
        )}
      </div>

      <div className="card p-3 sm:p-4 flex flex-wrap gap-2 sm:gap-3">
        <select className="input w-auto text-sm" value={filterMois} onChange={e => setFilterMois(e.target.value)}>
          <option value="">{t('paie.allMonths')}</option>
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input
          type="number" className="input w-28 text-sm" placeholder={t('paie.year')}
          value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : fiches.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">{t('paie.noResults')}</div>
        ) : (
          <>
            {/* Vue mobile — cartes */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {fiches.map(f => {
                const sb = statutPaieBadge(f.statut, t)
                return (
                  <div key={f.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{f.employe_nom}</span>
                        <span className={sb.class}>{sb.label}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{periode(f)}</div>
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">{formatFCFA(f.montant_net, lang)}</div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => setPayslip(f)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <Printer size={15} />
                      </button>
                      {canManagePaie && f.statut === 'en_attente' && (
                        <button onClick={() => handleMarkPaid(f)} disabled={marking === f.id} className="p-2 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {canManagePaie && (
                        <button onClick={() => openEdit(f)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <Edit2 size={15} />
                        </button>
                      )}
                      {canDeletePaie && (
                        <button onClick={() => setDeleteTarget(f)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
                    <th className="th">{t('paie.employee')}</th>
                    <th className="th">{t('paie.period')}</th>
                    <th className="th text-right">{t('paie.baseSalary')}</th>
                    <th className="th text-right">{t('paie.netAmount')}</th>
                    <th className="th">{t('paie.paymentMode')}</th>
                    <th className="th">{t('paie.status')}</th>
                    <th className="th">{t('paie.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {fiches.map(f => {
                    const sb = statutPaieBadge(f.statut, t)
                    return (
                      <tr key={f.id} className="tr">
                        <td className="td font-medium">{f.employe_nom}</td>
                        <td className="td text-xs">{periode(f)}</td>
                        <td className="td text-right">{formatFCFA(f.salaire_base, lang)}</td>
                        <td className="td text-right font-medium">{formatFCFA(f.montant_net, lang)}</td>
                        <td className="td text-xs">{paymentLabels[f.mode_paiement] || f.mode_paiement}</td>
                        <td className="td"><span className={sb.class}>{sb.label}</span></td>
                        <td className="td">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setPayslip(f)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors" title={t('paie.print')}>
                              <Printer size={14} />
                            </button>
                            {canManagePaie && f.statut === 'en_attente' && (
                              <button onClick={() => handleMarkPaid(f)} disabled={marking === f.id} className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-colors" title={t('paie.markPaid')}>
                                <CheckCircle size={14} />
                              </button>
                            )}
                            {canManagePaie && (
                              <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDeletePaie && (
                              <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
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

      <PayslipModal fiche={payslip} onClose={() => setPayslip(null)} />

      <ConfirmModal
        open={!!deleteTarget}
        title={t('paie.deleteTitle')}
        message={deleteTarget ? t('paie.deleteMessage', { nom: deleteTarget.employe_nom, periode: periode(deleteTarget) }) : ''}
        confirmLabel={t('paie.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {modal === 'add' ? t('paie.addTitle') : t('paie.editTitle')}
              </h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.employee')}</label>
                <select className="input" value={form.employe} onChange={e => handleEmployeChange(e.target.value)}>
                  <option value="">{t('paie.selectEmployee')}</option>
                  {employes.map(e => <option key={e.id} value={e.id}>{e.first_name ? `${e.first_name} ${e.last_name || ''}`.trim() : e.username}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.month')}</label>
                  <select className="input" value={form.mois} onChange={e => field('mois', parseInt(e.target.value))}>
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.year')}</label>
                  <input type="number" className="input" value={form.annee} onChange={e => field('annee', parseInt(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.baseSalary')}</label>
                  <input type="number" className="input" value={form.salaire_base} onChange={e => field('salaire_base', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.bonuses')}</label>
                  <input type="number" className="input" value={form.primes} onChange={e => field('primes', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.deductions')}</label>
                  <input type="number" className="input" value={form.deductions} onChange={e => field('deductions', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.paymentMode')}</label>
                <select className="input" value={form.mode_paiement} onChange={e => field('mode_paiement', e.target.value)}>
                  <option value="especes">{t('paie.cash')}</option>
                  <option value="mobile_money">{t('paie.mobile')}</option>
                  <option value="virement">{t('paie.transfer')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('paie.observations')}</label>
                <textarea className="input resize-none" rows={2} value={form.observations} onChange={e => field('observations', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">{t('paie.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : t('paie.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
