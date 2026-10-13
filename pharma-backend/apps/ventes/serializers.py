from decimal import Decimal
from rest_framework import serializers
from django.conf import settings
from django.db import transaction
from .models import Vente, LigneVente
from apps.medicaments.models import Medicament


class LigneVenteSerializer(serializers.ModelSerializer):
    medicament = serializers.PrimaryKeyRelatedField(queryset=Medicament.objects.filter(est_actif=True))
    medicament_nom = serializers.CharField(source='medicament.nom', read_only=True)
    quantite = serializers.IntegerField(min_value=1)

    class Meta:
        model = LigneVente
        fields = ['id', 'medicament', 'medicament_nom', 'quantite', 'prix_unitaire', 'sous_total', 'taux_tva', 'montant_ht', 'montant_tva']
        read_only_fields = ['prix_unitaire', 'sous_total', 'taux_tva', 'montant_ht', 'montant_tva']


class VenteSerializer(serializers.ModelSerializer):
    lignes = LigneVenteSerializer(many=True)
    vendeur_nom = serializers.SerializerMethodField()

    def get_vendeur_nom(self, obj):
        if not obj.vendeur:
            return '—'
        return obj.vendeur.get_full_name() or obj.vendeur.username
    monnaie_rendue = serializers.ReadOnlyField()
    mode_paiement_display = serializers.CharField(source='get_mode_paiement_display', read_only=True)

    class Meta:
        model = Vente
        fields = [
            'id', 'reference', 'client_nom', 'client_telephone',
            'lignes', 'montant_total', 'montant_ht', 'montant_tva', 'montant_paye', 'monnaie_rendue',
            'mode_paiement', 'mode_paiement_display', 'operateur', 'reference_paiement', 'statut',
            'observations', 'vendeur', 'vendeur_nom', 'date_vente',
            'numero_ordonnance', 'prescripteur_nom', 'prescripteur_ordre', 'ordonnance_date', 'ordonnance_scan',
        ]
        read_only_fields = ['reference', 'date_vente', 'montant_total', 'montant_ht', 'montant_tva', 'reference_paiement', 'ordonnance_scan']

    def validate_lignes(self, lignes):
        if not lignes:
            raise serializers.ValidationError("La vente doit contenir au moins un article.")
        return lignes

    def validate(self, data):
        if data.get('mode_paiement') == 'mobile_money':
            if not data.get('operateur'):
                raise serializers.ValidationError({'operateur': "Opérateur requis pour Mobile Money."})
            if not data.get('client_telephone'):
                raise serializers.ValidationError({'client_telephone': "Téléphone requis pour Mobile Money."})
        return data

    @transaction.atomic
    def create(self, validated_data):
        from apps.stocks.models import MouvementStock
        lignes_data = validated_data.pop('lignes')
        est_mobile_money = validated_data.get('mode_paiement') == 'mobile_money'

        # Vérifier les stocks avant toute modification
        for ligne_data in lignes_data:
            medicament = ligne_data['medicament']
            quantite = ligne_data['quantite']
            if medicament.quantite_stock < quantite:
                raise serializers.ValidationError({
                    'error_code': 'insufficient_stock',
                    'medicament': medicament.nom,
                    'disponible': medicament.quantite_stock,
                })

        if est_mobile_money:
            # Le paiement n'est pas encore confirmé : pas de montant payé, statut en attente.
            validated_data['montant_paye'] = 0
            validated_data['statut'] = 'en_attente'

        vente = Vente.objects.create(**validated_data)
        montant_total = 0
        montant_ht_total = 0
        montant_tva_total = 0

        for ligne_data in lignes_data:
            medicament = ligne_data['medicament']
            quantite = ligne_data['quantite']
            prix_unitaire = medicament.prix_vente
            sous_total = prix_unitaire * quantite
            montant_total += sous_total

            # Le prix de vente est TTC : la TVA est extraite (pas ajoutée) pour les
            # produits non exonérés — les médicaments (taux 0) restent HT = TTC.
            taux = Decimal(str(settings.TAUX_TVA)) if medicament.type_produit == 'parapharmacie' else Decimal('0')
            montant_ht = round(sous_total / (1 + taux / 100))
            montant_tva = sous_total - montant_ht
            montant_ht_total += montant_ht
            montant_tva_total += montant_tva

            LigneVente.objects.create(
                vente=vente,
                medicament=medicament,
                quantite=quantite,
                prix_unitaire=prix_unitaire,
                sous_total=sous_total,
                taux_tva=taux,
                montant_ht=montant_ht,
                montant_tva=montant_tva,
            )

            if not est_mobile_money:
                # MouvementStock.save() gère la mise à jour du stock — pas de déduction manuelle
                MouvementStock.objects.create(
                    medicament=medicament,
                    type_mouvement='sortie',
                    quantite=quantite,
                    motif=f"Vente {vente.reference}",
                    reference=vente.reference,
                    utilisateur=validated_data.get('vendeur')
                )

        vente.montant_total = montant_total
        vente.montant_ht = montant_ht_total
        vente.montant_tva = montant_tva_total
        vente.save()
        return vente
