import { useEffect, useState } from 'react'
import { Users, Plus, Edit2, UserCheck, UserX, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../services/api'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/formatters'
import ConfirmModal from '../components/ConfirmModal'

const ROLE_BADGE = {
  admin:      'badge-danger',
  pharmacien: 'badge-info',
  caissier:   'badge-gray',
}

const EMPTY_CREATE = { username: '', first_name: '', last_name: '', email: '', role: 'pharmacien', telephone: '', password: '' }

export default function UtilisateursPage() {
  const { t, lang } = useLang()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [modal, setModal] = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})

  const load = () => {
    setLoading(true)
    userService.lister({ page_size: 500 })
      .then(r => setUsers(r.data.results ?? r.data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(EMPTY_CREATE)
    setModal({ mode: 'create' })
  }

  const openEdit = (u) => {
    setForm({
      first_name: u.first_name || '',
      last_name:  u.last_name  || '',
      email:      u.email      || '',
      role:       u.role,
      telephone:  u.telephone  || '',
      est_actif:  u.est_actif,
      password:   '',
    })
    setModal({ mode: 'edit', data: u })
  }

  const handleToggleActif = (u) => {
    if (u.est_actif) {
      setConfirmDeactivate(u)
    } else {
      doToggle(u)
    }
  }

  const doToggle = async (u) => {
    try {
      await userService.modifier(u.id, { est_actif: !u.est_actif })
      toast.success(u.est_actif ? t('users.toastDeactivated') : t('users.toastActivated'))
      setConfirmDeactivate(null)
      load()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...form }
      if (modal.mode === 'edit' && !data.password) delete data.password
      if (modal.mode === 'create') {
        await userService.creer(data)
        toast.success(t('users.toastCreated'))
      } else {
        await userService.modifier(modal.data.id, data)
        toast.success(t('users.toastEdited'))
      }
      setModal(null)
      load()
    } catch (err) {
      const msg = err.response?.data
      const text = msg && typeof msg === 'object'
        ? Object.values(msg).flat().join(' · ')
        : t('common.error')
      toast.error(text)
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      u.username?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q)
    return matchSearch && (!filterRole || u.role === filterRole)
  })

  const displayName = (u) =>
    u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username

  const initial = (u) =>
    (u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()

  const field = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('users.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('users.subtitle')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          {t('users.add')}
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder={t('users.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
        >
          <option value="">{t('users.allRoles')}</option>
          <option value="admin">{t('users.roles.admin')}</option>
          <option value="pharmacien">{t('users.roles.pharmacien')}</option>
          <option value="caissier">{t('users.roles.caissier')}</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t('users.noResults')}</p>
          </div>
        ) : (
          <>
            {/* Vue mobile — cartes */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(u => (
                <div key={u.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">{initial(u)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{displayName(u)}</span>
                      <span className={ROLE_BADGE[u.role] || 'badge-gray'}>{t(`users.roles.${u.role}`)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      @{u.username} · {u.est_actif ? t('users.active') : t('users.inactive')}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => openEdit(u)} title={t('users.editTitle')} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Edit2 size={15} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleToggleActif(u)}
                        title={u.est_actif ? t('users.deactivate') : t('users.activate')}
                        className={`p-2 rounded-lg transition-colors ${u.est_actif ? 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20' : 'text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20'}`}
                      >
                        {u.est_actif ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Vue desktop — tableau */}
            <table className="hidden sm:table w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="th">{t('users.username')}</th>
                  <th className="th">{t('users.role')}</th>
                  <th className="th hidden md:table-cell">{t('users.phone')}</th>
                  <th className="th hidden lg:table-cell">{t('users.createdAt')}</th>
                  <th className="th">{t('users.status')}</th>
                  <th className="th text-right">{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="tr">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-green-700 dark:text-green-400">{initial(u)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">{displayName(u)}</div>
                          <div className="text-xs text-gray-400">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <span className={ROLE_BADGE[u.role] || 'badge-gray'}>{t(`users.roles.${u.role}`)}</span>
                    </td>
                    <td className="td hidden md:table-cell text-gray-500 dark:text-gray-400">{u.telephone || '—'}</td>
                    <td className="td hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">{formatDateTime(u.date_creation, lang)}</td>
                    <td className="td">
                      <span className={u.est_actif ? 'badge-success' : 'badge-gray'}>
                        {u.est_actif ? t('users.active') : t('users.inactive')}
                      </span>
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(u)} title={t('users.editTitle')} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleActif(u)}
                            title={u.est_actif ? t('users.deactivate') : t('users.activate')}
                            className={`p-1.5 rounded-lg transition-colors ${u.est_actif ? 'text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400' : 'text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400'}`}
                          >
                            {u.est_actif ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Modal créer / modifier */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {modal.mode === 'create' ? t('users.addTitle') : t('users.editTitle')}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4" autoComplete="off">
              {modal.mode === 'create' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('users.username')} *
                  </label>
                  <input
                    className="input"
                    required
                    autoFocus
                    autoComplete="off"
                    value={form.username}
                    onChange={e => field('username', e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('users.username')}
                  </label>
                  <input
                    className="input bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    value={modal.data?.username || ''}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('users.firstName')}
                  </label>
                  <input className="input" value={form.first_name} onChange={e => field('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('users.lastName')}
                  </label>
                  <input className="input" value={form.last_name} onChange={e => field('last_name', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('users.email')}
                </label>
                <input type="email" className="input" value={form.email} onChange={e => field('email', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('users.role')}
                  </label>
                  <select className="input" value={form.role} onChange={e => field('role', e.target.value)}>
                    <option value="admin">{t('users.roles.admin')}</option>
                    <option value="pharmacien">{t('users.roles.pharmacien')}</option>
                    <option value="caissier">{t('users.roles.caissier')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('users.phone')}
                  </label>
                  <input className="input" value={form.telephone} onChange={e => field('telephone', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('users.password')}
                  {modal.mode === 'edit' && (
                    <span className="text-xs text-gray-400 font-normal ml-2">({t('users.passwordHint')})</span>
                  )}
                  {modal.mode === 'create' && ' *'}
                </label>
                <input
                  type="password"
                  className="input"
                  required={modal.mode === 'create'}
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => field('password', e.target.value)}
                />
              </div>

              {modal.mode === 'edit' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.est_actif}
                    onChange={e => field('est_actif', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('users.active')}</span>
                </label>
              )}

              <div className="flex gap-3 pt-1 sticky bottom-0 bg-white dark:bg-gray-800 pb-1">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">
                  {t('users.cancel')}
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    </span>
                  ) : t('users.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeactivate}
        title={t('users.deactivateTitle')}
        message={confirmDeactivate ? t('users.deactivateMessage', { username: confirmDeactivate.username }) : ''}
        confirmLabel={t('users.deactivate')}
        danger={false}
        onConfirm={() => doToggle(confirmDeactivate)}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  )
}
