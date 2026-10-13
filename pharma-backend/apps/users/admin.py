from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur

@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    list_display = ['username', 'first_name', 'last_name', 'email', 'role', 'est_actif']
    list_filter = ['role', 'est_actif']
    # is_active est recopié depuis est_actif à l'enregistrement (voir Utilisateur.save)
    readonly_fields = ['is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Informations PharmaGest', {'fields': ('role', 'telephone', 'est_actif')}),
    )
