import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LangProvider } from './context/LangContext'
import { OfflineProvider } from './context/OfflineContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MedicamentsPage from './pages/MedicamentsPage'
import StocksPage from './pages/StocksPage'
import VentesPage from './pages/VentesPage'
import AlertesPage from './pages/AlertesPage'
import UtilisateursPage from './pages/UtilisateursPage'
import PaiePage from './pages/PaiePage'
import CommandesPage from './pages/CommandesPage'
import RegistreDpmlPage from './pages/RegistreDpmlPage'
import RapportMensuelPage from './pages/RapportMensuelPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user?.role === 'admin' ? children : <Navigate to="/" replace />
}

function PharmacistRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return ['admin', 'pharmacien'].includes(user?.role) ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="medicaments" element={<MedicamentsPage />} />
        <Route path="stocks" element={<StocksPage />} />
        <Route path="commandes" element={<CommandesPage />} />
        <Route path="ventes" element={<VentesPage />} />
        <Route path="paie" element={<PaiePage />} />
        <Route path="alertes" element={<PharmacistRoute><AlertesPage /></PharmacistRoute>} />
        <Route path="registre-dpml" element={<PharmacistRoute><RegistreDpmlPage /></PharmacistRoute>} />
        <Route path="rapport-mensuel" element={<PharmacistRoute><RapportMensuelPage /></PharmacistRoute>} />
        <Route path="utilisateurs" element={<AdminRoute><UtilisateursPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <OfflineProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: { borderRadius: '10px', fontSize: '14px' },
                  success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
                }}
              />
            </BrowserRouter>
          </OfflineProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  )
}
