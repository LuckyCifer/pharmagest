import { useEffect, useState } from 'react'
import { Plus, X, Trash2, Download, ChevronDown, ChevronUp, Printer, FileText, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import { venteService, medicamentService } from '../services/api'
import { useLang } from '../context/LangContext'
import { usePermissions } from '../hooks/usePermissions'
import { formatFCFA, formatDateTime } from '../utils/formatters'
import ReceiptModal from '../components/ReceiptModal'
import Pagination from '../components/Pagination'

const STATUT_BADGE = { validee: 'badge-success', en_attente: 'badge-warning', annulee: 'badge-danger' }

const STATUT_LABEL_KEY = { validee: 'sales.validated', en_attente: 'sales.pending', annulee: 'sales.cancelled' }

export default function VentesPage() {
  const { t, lang } = useLang()
  const { canExportSales } = usePermissions()
  const [ventes, setVentes] = useState([])
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [exportPreview, setExportPreview] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [form, setForm] = useState({
    client_nom: '', client_telephone: '', mode_paiement: 'especes', operateur: 'mtn',
    montant_paye: '', observations: '', lignes: [],
    numero_ordonnance: '', prescripteur_nom: '', prescripteur_ordre: '', ordonnance_date: ''
  })
  const [ordonnanceOpen, setOrdonnanceOpen] = useState(false)
  const [ordonnanceFile, setOrdonnanceFile] = useState(null)
  const [pendingVente, setPendingVente] = useState(null)
  const [pendingResult, setPendingResult] = useState(null)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)

  const load = () => {
    setLoading(true)
    Promise.all([venteService.lister({ page }), medicamentService.lister({ page_size: 500 })])
      .then(([r1, r2]) => {
        setVentes(r1.data.results ?? r1.data)
        setCount(r1.data.count ?? (r1.data.results ?? r1.data).length)
        setMeds(r2.data.results ?? r2.data)
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const openModal = () => {
    setForm({
      client_nom: '', client_telephone: '', mode_paiement: 'especes', operateur: 'mtn', montant_paye: '', observations: '', lignes: [],
      numero_ordonnance: '', prescripteur_nom: '', prescripteur_ordre: '', ordonnance_date: ''
    })
    setOrdonnanceOpen(false)
    setOrdonnanceFile(null)
    setModal(true)
  }

  const addLigne = () => setForm(p => ({ ...p, lignes: [...p.lignes, { medicament: '', quantite: 1 }] }))
  const removeLigne = (i) => setForm(p => ({ ...p, lignes: p.lignes.filter((_, idx) => idx !== i) }))
  const updateLigne = (i, k, v) => setForm(p => ({ ...p, lignes: p.lignes.map((l, idx) => idx === i ? { ...l, [k]: v } : l) }))

  const calcTotal = () => form.lignes.reduce((acc, l) => {
    const med = meds.find(m => String(m.id) === String(l.medicament))
    return acc + (med ? med.prix_vente * (parseInt(l.quantite) || 0) : 0)
  }, 0)

  const handleSave = async () => {
    if (form.lignes.length === 0) return toast.error(t('sales.toastNoLine'))
    if (form.lignes.some(l => !l.medicament || !l.quantite)) return toast.error(t('sales.toastIncompleteLines'))
    if (form.mode_paiement === 'mobile_money' && !form.client_telephone) return toast.error(t('sales.phoneRequiredMomo'))
    setSaving(true)
    try {
      const payload = {
        ...form,
        montant_paye: parseInt(form.montant_paye) || calcTotal(),
        lignes: form.lignes.map(l => ({ medicament: parseInt(l.medicament), quantite: parseInt(l.quantite) }))
      }
      if (!payload.ordonnance_date) delete payload.ordonnance_date
      const res = await venteService.creer(payload)
      if (ordonnanceFile) {
        try { await venteService.uploadOrdonnanceScan(res.data.id, ordonnanceFile) }
        catch { toast.error(t('sales.toastScanUploadFailed')) }
      }
      setModal(false)
      if (res.data.mode_paiement === 'mobile_money' && res.data.statut === 'en_attente') {
        setPendingVente(res.data)
        pollPaiement(res.data.id)
      } else {
        toast.success(t('sales.toastSaved'))
        setReceipt(res.data)
        load()
      }
    } catch (e) {
      const data = e.response?.data
      if (data?.error_code === 'insufficient_stock') {
        toast.error(t('sales.insufficientStock', { nom: data.medicament, disponible: data.disponible }))
      } else if (data?.error_code === 'notchpay_error') {
        toast.error(data.detail || t('common.error'))
      } else {
        toast.error(data?.[0] || data?.detail || t('common.error'))
      }
    }
    finally { setSaving(false) }
  }

  const pollPaiement = (venteId, attempt = 0) => {
    setPendingResult(null)
    if (attempt >= 24) { setPendingResult('timeout'); return }
    setTimeout(async () => {
      try {
        const res = await venteService.statutPaiement(venteId)
        if (res.data.statut === 'validee') {
          setPendingResult('validee')
          setPendingVente(null)
          toast.success(t('sales.toastSaved'))
          setReceipt(res.data)
          load()
        } else if (res.data.statut === 'annulee') {
          setPendingResult('annulee')
          toast.error(t('sales.paymentFailed'))
          load()
        } else {
          pollPaiement(venteId, attempt + 1)
        }
      } catch {
        pollPaiement(venteId, attempt + 1)
      }
    }, 3000)
  }

  const openExportPreview = async () => {
    setExportLoading(true)
    setExportPreview([])
    try {
      const res = await venteService.exportPreview()
      setExportPreview(res.data)
    } catch { toast.error(t('common.error')); setExportPreview(null) }
    finally { setExportLoading(false) }
  }

  const downloadCsv = async () => {
    setDownloading(true)
    try {
      const res = await venteService.exportCsv()
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'ventes.csv'; a.click()
      setExportPreview(null)
    } catch { toast.error(t('common.error')) }
    finally { setDownloading(false) }
  }

  const paymentLabels = { especes: t('sales.cash'), mobile_money: t('sales.mobile'), carte: t('sales.card'), credit: t('sales.credit') }
  const statutLabel = (s) => STATUT_LABEL_KEY[s] ? t(STATUT_LABEL_KEY[s]) : s
  const total = calcTotal()
  const paye = parseInt(form.montant_paye) || 0
  const monnaie = Math.max(0, paye - total)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('sales.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('sales.subtitle')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {canExportSales && (
            <button onClick={openExportPreview} className="btn-secondary flex items-center gap-1.5">
              <Download size={15} />
              <span className="hidden sm:inline">{t('sales.export')}</span>
            </button>
          )}
          <button onClick={openModal} className="btn-primary flex items-center gap-1.5">
            <Plus size={16} />
            <span className="hidden sm:inline">{t('sales.newSale')}</span>
            <span className="sm:hidden">{t('sales.newSaleShort')}</span>
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : ventes.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">{t('sales.noResults')}</div>
        ) : (
          <>
            {/* Vue mobile — cartes */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {ventes.map(v => (
                <div key={v.id}>
                  <div
                    className="p-4 flex items-start justify-between gap-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50"
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium text-sm text-gray-900 dark:text-white">{v.reference}</span>
                        <span className={STATUT_BADGE[v.statut] || 'badge-gray'}>{statutLabel(v.statut)}</span>
                        {v.numero_ordonnance && (
                          <span className="badge-gray flex items-center gap-1" title={t('sales.prescriptionBadge')}>
                            <FileText size={11} /> {t('sales.prescription')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(v.date_vente, lang)}{v.client_nom ? ` · ${v.client_nom}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {paymentLabels[v.mode_paiement] || v.mode_paiement}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{formatFCFA(v.montant_total, lang)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => { e.stopPropagation(); setReceipt(v) }}
                          className="p-1 text-gray-400 hover:text-green-600 rounded transition-colors"
                          title={t('sales.printReceipt')}
                        >
                          <Printer size={13} />
                        </button>
                        {expanded === v.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </div>
                  </div>
                  {expanded === v.id && v.lignes?.length > 0 && (
                    <div className="px-4 pb-3 space-y-1.5 bg-gray-50 dark:bg-gray-700/30">
                      {v.lignes.map((l, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400 py-0.5">
                          <span>{l.medicament_nom} × {l.quantite}</span>
                          <span className="font-medium">{formatFCFA(l.sous_total, lang)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Vue desktop — tableau */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="th w-8"></th>
                    <th className="th">{t('sales.ref')}</th>
                    <th className="th">{t('sales.date')}</th>
                    <th className="th">{t('sales.client')}</th>
                    <th className="th text-right">{t('sales.amount')}</th>
                    <th className="th">{t('sales.payment')}</th>
                    <th className="th">{t('sales.seller')}</th>
                    <th className="th">{t('sales.status')}</th>
                    <th className="th w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {ventes.map(v => (
                    <>
                      <tr key={v.id} className="tr cursor-pointer" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
                        <td className="td text-gray-400">
                          {expanded === v.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                        <td className="td font-mono font-medium">
                          <div className="flex items-center gap-1.5">
                            {v.reference}
                            {v.numero_ordonnance && <FileText size={13} className="text-gray-400" title={t('sales.prescriptionBadge')} />}
                          </div>
                        </td>
                        <td className="td text-xs">{formatDateTime(v.date_vente, lang)}</td>
                        <td className="td">{v.client_nom || '—'}</td>
                        <td className="td text-right font-medium">{formatFCFA(v.montant_total, lang)}</td>
                        <td className="td text-xs">{paymentLabels[v.mode_paiement] || v.mode_paiement}</td>
                        <td className="td text-xs">{v.vendeur_nom || '—'}</td>
                        <td className="td"><span className={STATUT_BADGE[v.statut] || 'badge-gray'}>{statutLabel(v.statut)}</span></td>
                        <td className="td">
                          <button
                            onClick={e => { e.stopPropagation(); setReceipt(v) }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title={t('sales.printReceipt')}
                          >
                            <Printer size={14} />
                          </button>
                        </td>
                      </tr>
                      {expanded === v.id && (
                        <tr key={`${v.id}-detail`} className="bg-gray-50 dark:bg-gray-700/30">
                          <td colSpan={9} className="px-6 py-3">
                            <table className="w-full text-xs">
                              <thead><tr>
                                <th className="text-left pb-1 text-gray-500">{t('sales.medication')}</th>
                                <th className="text-right pb-1 text-gray-500">{t('sales.qty')}</th>
                                <th className="text-right pb-1 text-gray-500">{t('sales.unitPrice')}</th>
                                <th className="text-right pb-1 text-gray-500">{t('sales.subtotal')}</th>
                              </tr></thead>
                              <tbody>
                                {v.lignes?.map((l, i) => (
                                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                                    <td className="py-1 text-gray-700 dark:text-gray-300">{l.medicament_nom}</td>
                                    <td className="py-1 text-right">{l.quantite}</td>
                                    <td className="py-1 text-right">{formatFCFA(l.prix_unitaire, lang)}</td>
                                    <td className="py-1 text-right font-medium">{formatFCFA(l.sous_total, lang)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} setPage={setPage} count={count} />
      </div>

      {/* Reçu de vente */}
      <ReceiptModal vente={receipt} onClose={() => setReceipt(null)} />

      {/* Paiement Mobile Money en attente */}
      {pendingVente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            {pendingResult === 'timeout' ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('sales.paymentTimeout')}</p>
                <button onClick={() => setPendingVente(null)} className="btn-secondary w-full">{t('common.close')}</button>
              </>
            ) : (
              <>
                <div className="mx-auto animate-spin h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('sales.waitingPayment')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('sales.waitingPaymentHint')}</p>
                <p className="text-xs text-gray-400 font-mono">{pendingVente.reference}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Aperçu de l'export CSV */}
      {exportPreview !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('sales.exportPreviewTitle')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('sales.exportPreviewSubtitle')}</p>
              </div>
              <button onClick={() => setExportPreview(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            {exportLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
              </div>
            ) : exportPreview.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-sm">{t('sales.exportEmpty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="th">{t('sales.ref')}</th>
                      <th className="th">{t('sales.date')}</th>
                      <th className="th">{t('sales.client')}</th>
                      <th className="th text-right">{t('sales.amount')}</th>
                      <th className="th">{t('sales.payment')}</th>
                      <th className="th">{t('sales.seller')}</th>
                      <th className="th">{t('sales.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportPreview.map(v => (
                      <tr key={v.id} className="tr">
                        <td className="td font-mono text-xs">{v.reference}</td>
                        <td className="td text-xs">{formatDateTime(v.date_vente, lang)}</td>
                        <td className="td text-xs">{v.client_nom || '—'}</td>
                        <td className="td text-right text-xs">{formatFCFA(v.montant_total, lang)}</td>
                        <td className="td text-xs">{paymentLabels[v.mode_paiement] || v.mode_paiement}</td>
                        <td className="td text-xs">{v.vendeur_nom || '—'}</td>
                        <td className="td"><span className={STATUT_BADGE[v.statut] || 'badge-gray'}>{statutLabel(v.statut)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={() => setExportPreview(null)} className="btn-secondary flex-1">{t('sales.cancel')}</button>
              <button onClick={downloadCsv} disabled={downloading || exportLoading || exportPreview.length === 0} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
                {downloading ? <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <><Download size={15} />{t('sales.download')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouvelle vente — bottom sheet mobile, centré desktop */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('sales.newSale')}</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.client')}</label>
                  <input className="input" placeholder={t('sales.client_placeholder')} value={form.client_nom} onChange={e => setForm(p => ({ ...p, client_nom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.phone')}</label>
                  <input className="input" value={form.client_telephone} onChange={e => setForm(p => ({ ...p, client_telephone: e.target.value }))} />
                </div>
              </div>

              {/* Ordonnance médicale (optionnel) */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOrdonnanceOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <span className="flex items-center gap-2"><Paperclip size={14} /> {t('sales.prescriptionOptional')}</span>
                  {ordonnanceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {ordonnanceOpen && (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.prescriptionNumber')}</label>
                        <input className="input" value={form.numero_ordonnance} onChange={e => setForm(p => ({ ...p, numero_ordonnance: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.prescriptionDate')}</label>
                        <input type="date" className="input" value={form.ordonnance_date} onChange={e => setForm(p => ({ ...p, ordonnance_date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.prescriberName')}</label>
                        <input className="input" value={form.prescripteur_nom} onChange={e => setForm(p => ({ ...p, prescripteur_nom: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.prescriberOrder')}</label>
                        <input className="input" value={form.prescripteur_ordre} onChange={e => setForm(p => ({ ...p, prescripteur_ordre: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.prescriptionScan')}</label>
                      <input type="file" accept="application/pdf,image/*" className="input text-sm" onChange={e => setOrdonnanceFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Lignes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('sales.lines')}</label>
                  <button onClick={addLigne} className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 flex items-center gap-1 font-medium">
                    <Plus size={13} /> {t('sales.addLine')}
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lignes.map((l, i) => {
                    const med = meds.find(m => String(m.id) === String(l.medicament))
                    return (
                      <div key={i} className="flex flex-col sm:flex-row gap-2">
                        <select className="input flex-1 text-sm" value={l.medicament} onChange={e => updateLigne(i, 'medicament', e.target.value)}>
                          <option value="">{t('sales.selectMedication')}</option>
                          {meds.map(m => <option key={m.id} value={m.id}>{m.nom}{m.dosage ? ` (${m.dosage})` : ''} — {formatFCFA(m.prix_vente, lang)}</option>)}
                        </select>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number" min="1"
                            className="input w-20 text-center text-sm"
                            value={l.quantite}
                            onChange={e => updateLigne(i, 'quantite', e.target.value)}
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-28 text-right shrink-0">
                            {med ? formatFCFA(med.prix_vente * (parseInt(l.quantite) || 0), lang) : '—'}
                          </span>
                          <button onClick={() => removeLigne(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {form.lignes.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      {t('sales.noLines')}
                    </div>
                  )}
                </div>
              </div>

              {/* Total & paiement */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('sales.total')}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{formatFCFA(total, lang)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.payment')}</label>
                    <select className="input text-sm" value={form.mode_paiement} onChange={e => setForm(p => ({ ...p, mode_paiement: e.target.value }))}>
                      <option value="especes">{t('sales.cash')}</option>
                      <option value="mobile_money">{t('sales.mobile')}</option>
                      <option value="carte">{t('sales.card')}</option>
                      <option value="credit">{t('sales.credit')}</option>
                    </select>
                  </div>
                  {form.mode_paiement === 'mobile_money' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.momoOperator')}</label>
                      <select className="input text-sm" value={form.operateur} onChange={e => setForm(p => ({ ...p, operateur: e.target.value }))}>
                        <option value="mtn">{t('sales.mtn')}</option>
                        <option value="orange">{t('sales.orange')}</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('sales.paid')}</label>
                      <input type="number" className="input text-sm" placeholder={total} value={form.montant_paye} onChange={e => setForm(p => ({ ...p, montant_paye: e.target.value }))} />
                    </div>
                  )}
                </div>
                {form.mode_paiement !== 'mobile_money' && monnaie > 0 && (
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                    <span className="text-sm">{t('sales.change')}</span>
                    <span>{formatFCFA(monnaie, lang)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('sales.cancel')}</button>
              <button onClick={handleSave} disabled={saving || form.lignes.length === 0} className="btn-primary flex-1">
                {saving ? <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : t('sales.validate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
