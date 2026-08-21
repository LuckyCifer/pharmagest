from rest_framework import serializers
from .models import CommandeFournisseur, LigneCommande


class LigneCommandeSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.CharField(source='medicament.nom', read_only=True)

    class Meta:
        model = LigneCommande
        fields = [
            'id', 'medicament', 'medicament_nom', 'quantite_commandee', 'quantite_recue',
            'prix_unitaire', 'numero_lot', 'date_peremption', 'sous_total',
        ]
        read_only_fields = ['quantite_recue', 'numero_lot', 'date_peremption']

    sous_total = serializers.ReadOnlyField()


class CommandeFournisseurSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeSerializer(many=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    cree_par_nom = serializers.SerializerMethodField()

    def get_cree_par_nom(self, obj):
        if not obj.cree_par:
            return '—'
        return obj.cree_par.get_full_name() or obj.cree_par.username

    class Meta:
        model = CommandeFournisseur
        fields = [
            'id', 'reference', 'fournisseur', 'fournisseur_nom', 'statut', 'statut_display',
            'reference_livraison', 'observations', 'lignes',
            'cree_par', 'cree_par_nom', 'date_creation', 'date_reception',
        ]
        read_only_fields = ['reference', 'statut', 'reference_livraison', 'cree_par', 'date_creation', 'date_reception']

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        commande = CommandeFournisseur.objects.create(**validated_data)
        for ligne_data in lignes_data:
            LigneCommande.objects.create(commande=commande, **ligne_data)
        return commande

    def update(self, instance, validated_data):
        if instance.statut != 'envoyee':
            raise serializers.ValidationError("Seule une commande encore « Envoyée » (non reçue) peut être modifiée.")
        lignes_data = validated_data.pop('lignes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lignes_data is not None:
            instance.lignes.all().delete()
            for ligne_data in lignes_data:
                LigneCommande.objects.create(commande=instance, **ligne_data)
        return instance
