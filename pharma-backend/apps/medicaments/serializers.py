from rest_framework import serializers
from .models import Medicament, Categorie, Fournisseur


class CategorieSerializer(serializers.ModelSerializer):
    nombre_medicaments = serializers.SerializerMethodField()

    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description', 'nombre_medicaments', 'date_creation']

    def get_nombre_medicaments(self, obj):
        return obj.medicaments.filter(est_actif=True).count()


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = '__all__'


class MedicamentSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)
    statut_stock = serializers.ReadOnlyField()
    statut_peremption = serializers.ReadOnlyField()
    jours_avant_peremption = serializers.ReadOnlyField()
    marge_beneficiaire = serializers.ReadOnlyField()

    class Meta:
        model = Medicament
        fields = [
            'id', 'nom', 'denomination_commune', 'forme', 'type_produit', 'dosage',
            'categorie', 'categorie_nom', 'fournisseur', 'fournisseur_nom',
            'numero_lot', 'date_fabrication', 'date_peremption',
            'prix_achat', 'prix_vente', 'quantite_stock', 'seuil_alerte',
            'description', 'est_actif', 'sous_controle_dpml', 'motif_controle',
            'statut_stock', 'statut_peremption',
            'jours_avant_peremption', 'marge_beneficiaire',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['date_creation', 'date_modification']
