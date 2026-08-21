import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LangContext'
import { Pill, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { dark, toggle: toggleTheme } = useTheme()
  const { lang, toggleLang } = useLang()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success(lang === 'fr' ? 'Connexion réussie !' : 'Signed in successfully!')
      navigate('/', { replace: true })
    } catch {
      toast.error(lang === 'fr' ? 'Identifiants incorrects' : 'Incorrect credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">

      {/* Boutons haut droite */}
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <button
          onClick={toggleTheme}
          title={dark ? 'Mode clair' : 'Mode sombre'}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          onClick={toggleLang}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors tracking-wide"
        >
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
      </div>

      {/* Carte de connexion */}
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-600/30">
            <Pill size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PharmaGest</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {lang === 'fr' ? 'Système de gestion de pharmacie' : 'Pharmacy management system'}
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl dark:shadow-gray-900/50 p-7">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
            {lang === 'fr' ? 'Connexion' : 'Sign in'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {lang === 'fr' ? "Nom d'utilisateur" : 'Username'}
              </label>
              <input
                type="text"
                className="input"
                placeholder={lang === 'fr' ? 'ex: Lucky' : 'ex: Lucky'}
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {lang === 'fr' ? 'Mot de passe' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  {lang === 'fr' ? 'Connexion...' : 'Signing in...'}
                </span>
              ) : (lang === 'fr' ? 'Se connecter' : 'Sign in')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          PharmaGest — {lang === 'fr' ? 'Projet tutoré Licence GL' : 'Bachelor GL Project'} · ACERFI Formation
        </p>
      </div>
    </div>
  )
}
