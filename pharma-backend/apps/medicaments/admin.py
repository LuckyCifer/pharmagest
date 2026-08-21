from django.contrib import admin
from .models import Medicament, Categorie, Fournisseur

@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ['nom', 'description']
    search_fields = ['nom']

@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ['nom', 'contact', 'telephone', 'email']

@admin.register(Medicament)
class MedicamentAdmin(admin.ModelAdmin):
    list_display = ['nom', 'dosage', 'forme', 'categorie', 'prix_vente', 'quantite_stock', 'date_peremption']
    list_filter = ['forme', 'categorie', 'est_actif']
    search_fields = ['nom', 'denomination_commune', 'numero_lot']
