import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, AlertTriangle, ShoppingCart, Activity, XCircle, FileBarChart } from 'lucide-react'
import { dashboardService } from '../services/api'
import { useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'
import { usePermissions } from '../hooks/usePermissions'
import { formatFCFA } from '../utils/formatters'

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className="card p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={19} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate leading-tight">{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{label}</div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { t, lang } = useLang()
  const { dark } = useTheme()
  const { canViewAlerts } = usePermissions()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardService.stats()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-gray-400">{t('common.error')}</div>
  )

  const stats = [
    { icon: Package,       label: t('dashboard.totalMeds'),  value: data.medicaments.total,                color: 'bg-blue-500',   to: '/medicaments' },
    { icon: XCircle,       label: t('dashboard.ruptures'),   value: data.medicaments.ruptures,             color: 'bg-red-500',    to: '/medicaments?statut=rupture' },
    { icon: AlertTriangle, label: t('dashboard.critiques'),  value: data.medicaments.critiques,            color: 'bg-amber-500',  to: '/medicaments?statut=critique' },
    { icon: ShoppingCart,  label: t('dashboard.salesToday'), value: data.ventes.nb_ventes_aujourd_hui,     color: 'bg-green-500',  to: '/ventes' },
    { icon: TrendingUp,    label: t('dashboard.caToday'),    value: formatFCFA(data.ventes.ca_aujourd_hui, lang),color: 'bg-green-600',  to: '/ventes' },
    { icon: Activity,      label: t('dashboard.caMonth'),    value: formatFCFA(data.ventes.ca_mois, lang),       color: 'bg-indigo-500', to: '/ventes' },
  ]

  const chartColor = dark ? '#4ade80' : '#16a34a'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        {canViewAlerts && (
          <Link to="/rapport-mensuel" className="btn-secondary flex items-center gap-1.5 shrink-0">
            <FileBarChart size={15} />
            {t('rapport.title')}
          </Link>
        )}
      </div>

      {/* Stats grid — 2 colonnes mobile, 3 colonnes desktop */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Graphique */}
      <div className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('dashboard.chart7d')}</h2>
        {data.graphique_7j?.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.graphique_7j}>
              <defs>
                <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#f0f0f0'} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} width={40} />
              <Tooltip
                contentStyle={{ background: dark ? '#1f2937' : '#fff', border: 'none', borderRadius: 8, fontSize: 12 }}
                formatter={v => [formatFCFA(v, lang), 'CA']}
              />
              <Area type="monotone" dataKey="chiffre_affaires" stroke={chartColor} strokeWidth={2} fill="url(#colorCA)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">{t('dashboard.noData')}</div>
        )}
      </div>

      {/* Top médicaments */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('dashboard.topMeds')}</h2>
        </div>
        {data.top_medicaments?.length ? (
          <>
            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {data.top_medicaments.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.medicament__nom}</span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatFCFA(m.chiffre_affaires, lang)}</div>
                    <div className="text-xs text-gray-400">{m.total_vendu} {t('dashboard.qty').toLowerCase()}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <table className="hidden sm:table w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="th">#</th>
                  <th className="th">{t('dashboard.med')}</th>
                  <th className="th text-right">{t('dashboard.qty')}</th>
                  <th className="th text-right">{t('dashboard.ca')}</th>
                </tr>
              </thead>
              <tbody>
                {data.top_medicaments.map((m, i) => (
                  <tr key={i} className="tr">
                    <td className="td text-gray-400 font-medium">{i + 1}</td>
                    <td className="td font-medium">{m.medicament__nom}</td>
                    <td className="td text-right">{m.total_vendu}</td>
                    <td className="td text-right">{formatFCFA(m.chiffre_affaires, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="text-center text-gray-400 text-sm py-8">{t('dashboard.noData')}</div>
        )}
      </div>
    </div>
  )
}
