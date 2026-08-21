import { useEffect, useState } from 'react'
import { Download, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { medicamentService } from '../services/api'
import { useLang } from '../context/LangContext'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function RegistreDpmlPage() {
  const { t } = useLang()
  const [mois, setMois] = useState(currentMonth())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const load = () => {
    setLoading(true)
    medicamentService.registreControle({ mois })
      .then(r => setData(r.data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [mois])

  const downloadCsv = async () => {
    setDownloading(true)
    try {
      const res = await medicamentService.registreControleCsv(mois)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `registre_dpml_${mois}.csv`; a.click()
    } catch { toast.error(t('common.error')) }
    finally { setDownloading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-500" />
            {t('registre.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('registre.subtitle')}</p>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <input type="month" className="input w-auto text-sm" value={mois} onChange={e => setMois(e.target.value)} />
          <button onClick={downloadCsv} disabled={downloading || loading} className="btn-secondary flex items-center gap-1.5">
            {downloading ? <span className="inline-block animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" /> : <Download size={15} />}
            <span className="hidden sm:inline">{t('registre.export')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
        </div>
      ) : (
        <>
          {/* Médicaments sous contrôle */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('registre.medicamentsControles')}</h2>
            {data.medicaments_sous_controle.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-sm">{t('registre.noMedicamentsControles')}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.medicaments_sous_controle.map(m => (
                  <span key={m.id} className="badge-danger">{m.nom}{m.dosage ? ` (${m.dosage})` : ''} — {m.motif_controle}</span>
                ))}
              </div>
            )}
          </div>

          {/* Total sorties */}
          <div className="card p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('registre.totalSorties')}</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{data.total_sorties}</span>
          </div>

          {/* Mouvements */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('registre.movements')}</h2>
            </div>
            {data.mouvements.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-sm">{t('registre.noResults')}</div>
            ) : (
              <>
                {/* Vue mobile — cartes */}
                <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {data.mouvements.map((m, i) => (
                    <div key={i} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{m.medicament}</span>
                        <span className="font-mono font-bold text-red-500 text-sm">-{m.quantite}</span>
                      </div>
                      <div className="text-xs text-gray-400">{m.date} · {m.motif_controle}</div>
                      {m.reference_ordonnance && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('registre.prescriptionNumber')}: {m.reference_ordonnance}{m.prescripteur ? ` — ${m.prescripteur}` : ''}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">{t('registre.user')}: {m.utilisateur || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Vue desktop — tableau */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="th">{t('registre.date')}</th>
                        <th className="th">{t('registre.medication')}</th>
                        <th className="th">{t('registre.motif')}</th>
                        <th className="th text-right">{t('registre.qty')}</th>
                        <th className="th">{t('registre.prescriptionNumber')}</th>
                        <th className="th">{t('registre.prescriber')}</th>
                        <th className="th">{t('registre.user')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mouvements.map((m, i) => (
                        <tr key={i} className="tr">
                          <td className="td text-xs">{m.date}</td>
                          <td className="td font-medium">{m.medicament}</td>
                          <td className="td text-xs">{m.motif_controle}</td>
                          <td className="td text-right font-mono text-red-500">-{m.quantite}</td>
                          <td className="td text-xs font-mono">{m.reference_ordonnance || '—'}</td>
                          <td className="td text-xs">{m.prescripteur || '—'}</td>
                          <td className="td text-xs">{m.utilisateur || '—'}</td>
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
