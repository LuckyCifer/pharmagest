import { useEffect, useState } from 'react'
import { Download, Printer, FileBarChart } from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboardService } from '../services/api'
import { useLang } from '../context/LangContext'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export default function RapportMensuelPage() {
  const { t } = useLang()
  const [mois, setMois] = useState(currentMonth())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  const pharmacieNom = import.meta.env.VITE_PHARMACIE_NOM || 'PharmaGest'
  const niu = import.meta.env.VITE_PHARMACIE_NIU
  const adresse = import.meta.env.VITE_PHARMACIE_ADRESSE

  const load = () => {
    setLoading(true)
    dashboardService.rapportMensuel({ mois })
      .then(r => setData(r.data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [mois])

  const meds = data ? (tab === 'all' ? data.medicaments : data.sous_controle_uniquement) : []

  const downloadCsv = () => {
    const headers = [
      t('rapport.name'), t('rapport.dci'), t('rapport.form'), t('rapport.dosage'),
      t('rapport.stockStart'), t('rapport.entries'), t('rapport.exits'), t('rapport.stockEnd'),
      t('rapport.controlledDpml'),
    ]
    const rows = meds.map(m => [
      m.nom, m.DCI, m.forme, m.dosage, m.stock_debut, m.entrees, m.sorties, m.stock_fin,
      m.sous_controle ? t('rapport.yes') : t('rapport.no'),
    ])
    const csv = '﻿' + [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport_mensuel_${mois}${tab === 'controlled' ? '_sous_controle' : ''}.csv`
    a.click()
  }

  const exportPdf = () => {
    const win = window.open('', '_blank', 'width=1000,height=750')
    if (!win) return toast.error(t('common.error'))
    const rows = meds.map(m => `
      <tr>
        <td>${escapeHtml(m.nom)}</td>
        <td>${escapeHtml(m.DCI || '—')}</td>
        <td>${escapeHtml(m.forme)}</td>
        <td>${escapeHtml(m.dosage || '—')}</td>
        <td style="text-align:right">${m.stock_debut}</td>
        <td style="text-align:right">${m.entrees}</td>
        <td style="text-align:right">${m.sorties}</td>
        <td style="text-align:right">${m.stock_fin}</td>
      </tr>`).join('')
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t('rapport.title'))} — ${escapeHtml(data.periode)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .meta { font-size: 12px; color: #555; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; }
        th { background: #f3f4f6; text-align: left; }
      </style></head><body>
      <h1>${escapeHtml(pharmacieNom)}</h1>
      ${niu ? `<div class="meta">${escapeHtml(t('receipt.niu'))}: ${escapeHtml(niu)}</div>` : ''}
      ${adresse ? `<div class="meta">${escapeHtml(adresse)}</div>` : ''}
      <div class="meta" style="margin-top:10px;font-weight:bold;">${escapeHtml(t('rapport.title'))} — ${escapeHtml(data.periode)}</div>
      <div class="meta">${escapeHtml(t('rapport.generatedOn'))} ${escapeHtml(data.genere_le)}</div>
      <table><thead><tr>
        <th>${escapeHtml(t('rapport.name'))}</th><th>${escapeHtml(t('rapport.dci'))}</th>
        <th>${escapeHtml(t('rapport.form'))}</th><th>${escapeHtml(t('rapport.dosage'))}</th>
        <th>${escapeHtml(t('rapport.stockStart'))}</th><th>${escapeHtml(t('rapport.entries'))}</th>
        <th>${escapeHtml(t('rapport.exits'))}</th><th>${escapeHtml(t('rapport.stockEnd'))}</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileBarChart size={20} className="text-indigo-500" />
            {t('rapport.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('rapport.subtitle')}</p>
        </div>
        <div className="flex gap-2 items-center shrink-0 flex-wrap">
          <input type="month" className="input w-auto text-sm" value={mois} onChange={e => setMois(e.target.value)} />
          <button onClick={downloadCsv} disabled={loading || !data} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} />
            <span className="hidden sm:inline">{t('rapport.exportCsv')}</span>
          </button>
          <button onClick={exportPdf} disabled={loading || !data} className="btn-secondary flex items-center gap-1.5">
            <Printer size={15} />
            <span className="hidden sm:inline">{t('rapport.exportPdf')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.periode} · {t('rapport.generatedOn')} {data.genere_le}
          </div>

          {/* Onglets */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setTab('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'all' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {t('rapport.tabAll')} ({data.medicaments.length})
            </button>
            <button
              onClick={() => setTab('controlled')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'controlled' ? 'border-red-600 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {t('rapport.tabControlled')} ({data.sous_controle_uniquement.length})
            </button>
          </div>

          <div className="card overflow-hidden">
            {meds.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-sm">{t('rapport.noResults')}</div>
            ) : (
              <>
                {/* Vue mobile — cartes */}
                <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {meds.map((m, i) => (
                    <div key={i} className="p-4 space-y-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{m.nom}{m.dosage ? ` (${m.dosage})` : ''}</div>
                      <div className="text-xs text-gray-400">{m.forme}{m.DCI ? ` · ${m.DCI}` : ''}</div>
                      <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1 flex-wrap">
                        <span>{t('rapport.stockStart')}: <strong className="text-gray-900 dark:text-white">{m.stock_debut}</strong></span>
                        <span className="text-green-600">{t('rapport.entries')}: +{m.entrees}</span>
                        <span className="text-red-500">{t('rapport.exits')}: -{m.sorties}</span>
                        <span>{t('rapport.stockEnd')}: <strong className="text-gray-900 dark:text-white">{m.stock_fin}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vue desktop — tableau */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="th">{t('rapport.name')}</th>
                        <th className="th">{t('rapport.dci')}</th>
                        <th className="th">{t('rapport.form')}</th>
                        <th className="th">{t('rapport.dosage')}</th>
                        <th className="th text-right">{t('rapport.stockStart')}</th>
                        <th className="th text-right">{t('rapport.entries')}</th>
                        <th className="th text-right">{t('rapport.exits')}</th>
                        <th className="th text-right">{t('rapport.stockEnd')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meds.map((m, i) => (
                        <tr key={i} className="tr">
                          <td className="td font-medium">{m.nom}</td>
                          <td className="td text-xs">{m.DCI || '—'}</td>
                          <td className="td text-xs">{m.forme}</td>
                          <td className="td text-xs">{m.dosage || '—'}</td>
                          <td className="td text-right font-mono">{m.stock_debut}</td>
                          <td className="td text-right font-mono text-green-600 dark:text-green-400">+{m.entrees}</td>
                          <td className="td text-right font-mono text-red-500">-{m.sorties}</td>
                          <td className="td text-right font-mono font-medium">{m.stock_fin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
