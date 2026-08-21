import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Clock, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { stockService } from '../services/api'
import { useLang } from '../context/LangContext'
import { usePermissions } from '../hooks/usePermissions'
import { formatDateTime, formatDate } from '../utils/formatters'
import Pagination from '../components/Pagination'

const TYPE_CONFIG = {
  stock_critique:      { icon: AlertTriangle, color: 'text-amber-500', badge: 'badge-warning' },
  rupture:             { icon: XCircle,       color: 'text-red-500',   badge: 'badge-danger'  },
  peremption_urgente:  { icon: Clock,         color: 'text-red-500',   badge: 'badge-danger'  },
  peremption_proche:   { icon: Clock,         color: 'text-amber-500', badge: 'badge-warning' },
  perime:              { icon: Package,       color: 'text-gray-400',  badge: 'badge-gray'    },
}

export default function AlertesPage() {
  const { t, lang } = useLang()
  const { canResolveAlert } = usePermissions()
  const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [resolving, setResolving] = useState(null)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)

  const load = () => {
    setLoading(true)
    stockService.alertes({ type: filter || undefined, page })
      .then(r => {
        setAlertes(r.data.results ?? r.data)
        setCount(r.data.count ?? (r.data.results ?? r.data).length)
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter, page])
  useEffect(() => { setPage(1) }, [filter])

  const handleResolve = async (id) => {
    setResolving(id)
    try {
      await stockService.resoudreAlerte(id)
      toast.success(t('alerts.toastResolved'))
      load()
    } catch { toast.error(t('common.error')) }
    finally { setResolving(null) }
  }

  const types = [
    { value: '', label: t('alerts.all') },
    { value: 'stock_critique', label: t('alerts.stock_critique') },
    { value: 'rupture', label: t('alerts.rupture') },
    { value: 'peremption_urgente', label: t('alerts.peremption_urgente') },
    { value: 'peremption_proche', label: t('alerts.peremption_proche') },
    { value: 'perime', label: t('alerts.perime') },
  ]

  const typeLabel = (v) => types.find(tp => tp.value === v)?.label || v

  const alertMessage = (a) => {
    const nom = a.medicament_nom
    switch (a.type_alerte) {
      case 'rupture': return t('alerts.msg.rupture', { nom })
      case 'stock_critique': return t('alerts.msg.stockCritique', { nom, qty: a.quantite_stock, seuil: a.seuil_alerte })
      case 'perime': return t('alerts.msg.perime', { nom, date: formatDate(a.date_peremption, lang) })
      case 'peremption_urgente': return t('alerts.msg.peremptionUrgente', { nom, date: formatDate(a.date_peremption, lang) })
      case 'peremption_proche': return t('alerts.msg.peremptionProche', { nom, date: formatDate(a.date_peremption, lang) })
      default: return a.message
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('alerts.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('alerts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="badge-danger">{count} {t('alerts.active').toLowerCase()}</span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {types.map(tp => (
          <button
            key={tp.value}
            onClick={() => setFilter(tp.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === tp.value
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tp.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
        </div>
      ) : alertes.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('alerts.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertes.map(a => {
            const cfg = TYPE_CONFIG[a.type_alerte] || { icon: AlertTriangle, color: 'text-gray-400', badge: 'badge-gray' }
            const Icon = cfg.icon
            return (
              <div key={a.id} className="card p-4 flex items-start gap-4">
                <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{a.medicament_nom}</span>
                    <span className={cfg.badge}>{typeLabel(a.type_alerte)}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{alertMessage(a)}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(a.date_creation, lang)}</p>
                </div>
                {canResolveAlert && (
                  <button
                    onClick={() => handleResolve(a.id)}
                    disabled={resolving === a.id}
                    className="shrink-0 btn-secondary text-xs flex items-center gap-1.5 py-1.5"
                  >
                    <CheckCircle size={13} />
                    {resolving === a.id ? '...' : t('alerts.resolve')}
                  </button>
                )}
              </div>
            )
          })}
          <div className="card">
            <Pagination page={page} setPage={setPage} count={count} />
          </div>
        </div>
      )}
    </div>
  )
}
