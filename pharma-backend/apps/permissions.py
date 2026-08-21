from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """Administrateur uniquement."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsAdminOrPharmacien(permissions.BasePermission):
    """Administrateur ou Pharmacien."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'pharmacien')


class IsAdminOrPharmacienOrCaissier(permissions.BasePermission):
    """Tout le personnel — accès en lecture au module de paie."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'pharmacien', 'caissier')
