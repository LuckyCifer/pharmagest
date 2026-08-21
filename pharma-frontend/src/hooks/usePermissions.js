import { useAuth } from '../context/AuthContext'

export function usePermissions() {
  const { user } = useAuth()
  const role = user?.role

  return {
    isAdmin:            role === 'admin',
    isPharmacien:       role === 'pharmacien',
    isCaissier:         role === 'caissier',
    canEditMeds:        role === 'admin' || role === 'pharmacien',
    canDeleteMeds:      role === 'admin',
    canAddMovement:     role === 'admin' || role === 'pharmacien',
    canViewAlerts:      role === 'admin' || role === 'pharmacien',
    canResolveAlert:    role === 'admin' || role === 'pharmacien',
    canExportSales:     role === 'admin' || role === 'pharmacien',
    canManageUsers:     role === 'admin',
    canViewPaie:        role === 'admin' || role === 'pharmacien' || role === 'caissier',
    canManagePaie:      role === 'admin' || role === 'pharmacien',
    canDeletePaie:      role === 'admin',
    canManageCommandes: role === 'admin' || role === 'pharmacien',
    canDeleteCommande:  role === 'admin',
  }
}
