import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LangContext'
import {
  LayoutDashboard, Pill, Package, ShoppingCart,
  Bell, LogOut, User, Users, Menu, X, Sun, Moon, Wallet, Truck
} from 'lucide-react'
import { useState } from 'react'

const ROUTE_TITLES = {
  '/':               { fr: 'Tableau de bord',  en: 'Dashboard'       },
  '/medicaments':    { fr: 'Médicaments',       en: 'Medications'     },
  '/stocks':         { fr: 'Stocks',            en: 'Stocks'          },
  '/commandes':      { fr: 'Commandes',         en: 'Orders'          },
  '/ventes':         { fr: 'Ventes',            en: 'Sales'           },
  '/alertes':        { fr: 'Alertes',           en: 'Alerts'          },
  '/utilisateurs':   { fr: 'Utilisateurs',      en: 'Users'           },
  '/paie':           { fr: 'Paie',              en: 'Payroll'         },
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const { lang, t, toggleLang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isPharmacist = user?.role === 'admin' || user?.role === 'pharmacien'

  const navItems = [
    { to: '/',            icon: LayoutDashboard, label: t('nav.dashboard')   },
    { to: '/medicaments', icon: Pill,            label: t('nav.medications') },
    { to: '/stocks',      icon: Package,         label: t('nav.stocks')      },
    { to: '/commandes',   icon: Truck,           label: t('nav.commandes')   },
    { to: '/ventes',      icon: ShoppingCart,    label: t('nav.sales')       },
    { to: '/paie',        icon: Wallet,          label: t('nav.paie')        },
    ...(isPharmacist
      ? [{ to: '/alertes', icon: Bell, label: t('nav.alerts') }]
      : []),
    ...(user?.role === 'admin'
      ? [{ to: '/utilisateurs', icon: Users, label: t('nav.users') }]
      : []),
  ]

  const pageTitle = ROUTE_TITLES[location.pathname]?.[lang] ?? 'PharmaGest'
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 fixed h-full z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Pill size={16} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm">PharmaGest</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t('layout.subtitle')}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-medium dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center shrink-0">
              <User size={14} className="text-green-700 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role ? t(`users.roles.${user.role}`) : ''}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Zone principale (droite de la sidebar) ── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">

        {/* ── Header ── */}
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between px-5 h-14">

            {/* Gauche : hamburger mobile + titre de la page */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center gap-2">
                <div className="md:hidden w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                  <Pill size={12} className="text-white" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{pageTitle}</h2>
              </div>
            </div>

            {/* Droite : thème + langue + déconnexion */}
            <div className="flex items-center gap-1">
              {/* Thème */}
              <button
                onClick={toggleTheme}
                title={dark ? t('layout.lightMode') : t('layout.darkMode')}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* Langue */}
              <button
                onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors tracking-wide"
              >
                {lang === 'fr' ? 'EN' : 'FR'}
              </button>

              <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

              {/* Déconnexion */}
              <button
                onClick={handleLogout}
                title={t('nav.logout')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Menu mobile (overlay) ── */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
            <div
              className="w-72 h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
                  <Pill size={14} className="text-white" />
                </div>
                <span className="font-semibold text-sm dark:text-white">PharmaGest</span>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* ── Contenu de la page ── */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>

        {/* ── Footer ── */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                <Pill size={10} className="text-white" />
              </div>
              <span className="font-medium text-gray-600 dark:text-gray-400">PharmaGest</span>
              <span>·</span>
              <span>{t('layout.footerTagline')}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Version 1.0.0</span>
              <span>·</span>
              <span>{t('layout.timezone')}</span>
              <span>·</span>
              <span>© {new Date().getFullYear()} ACERFI Formation</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
