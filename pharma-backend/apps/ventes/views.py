from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction as db_transaction
import csv
from django.http import HttpResponse
from apps.permissions import IsAdminOrPharmacien
from .models import Vente
from .serializers import VenteSerializer


class VenteListCreateView(generics.ListCreateAPIView):
    serializer_class = VenteSerializer
    # Tous les rôles peuvent consulter et créer des ventes
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Vente.objects.prefetch_related('lignes__medicament').select_related('vendeur')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')
        if date_debut:
            qs = qs.filter(date_vente__date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date_vente__date__lte=date_fin)
        return qs

    def perform_create(self, serializer):
        vente = serializer.save(vendeur=self.request.user)
        if vente.mode_paiement == 'mobile_money':
            from . import notchpay
            try:
                trx = notchpay.initialiser_paiement(vente)
                notchpay.soumettre_paiement_direct(trx['reference'], vente.operateur, vente.client_telephone)
                vente.reference_paiement = trx['reference']
                vente.save()
            except notchpay.NotchPayError as e:
                vente.delete()
                raise serializers.ValidationError({'error_code': 'notchpay_error', 'detail': str(e)})


class VenteDetailView(generics.RetrieveAPIView):
    queryset = Vente.objects.prefetch_related('lignes__medicament').all()
    serializer_class = VenteSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAdminOrPharmacien])
def export_ventes_csv(request):
    ventes = Vente.objects.select_related('vendeur').all()

    if request.query_params.get('preview'):
        # Mêmes lignes que le CSV, en JSON avec codes bruts (traduits côté frontend),
        # pour un aperçu fidèle avant téléchargement.
        rows = [
            {
                'id': v.id,
                'reference': v.reference,
                'date_vente': v.date_vente,
                'client_nom': v.client_nom,
                'montant_total': v.montant_total,
                'mode_paiement': v.mode_paiement,
                'vendeur_nom': v.vendeur.get_full_name() if v.vendeur else '',
                'statut': v.statut,
            }
            for v in ventes
        ]
        return Response(rows)

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="ventes_pharmagest.csv"'
    response.write('﻿')  # BOM pour Excel

    writer = csv.writer(response, delimiter=';')
    writer.writerow(['Référence', 'Date', 'Client', 'Montant (FCFA)', 'Mode paiement', 'Vendeur', 'Statut'])

    for v in ventes:
        writer.writerow([
            v.reference,
            v.date_vente.strftime('%d/%m/%Y %H:%M'),
            v.client_nom,
            v.montant_total,
            v.get_mode_paiement_display(),
            v.vendeur.get_full_name() if v.vendeur else '',
            v.get_statut_display(),
        ])
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statut_paiement(request, pk):
    from . import notchpay
    from apps.stocks.models import MouvementStock

    try:
        vente = Vente.objects.prefetch_related('lignes__medicament').get(pk=pk)
    except Vente.DoesNotExist:
        return Response({'error': 'Vente non trouvée'}, status=status.HTTP_404_NOT_FOUND)

    if vente.statut != 'en_attente' or not vente.reference_paiement:
        return Response(VenteSerializer(vente).data)

    try:
        trx = notchpay.verifier_paiement(vente.reference_paiement)
    except notchpay.NotchPayError:
        # Erreur transitoire (réseau, etc.) — le frontend continuera de sonder.
        return Response(VenteSerializer(vente).data)

    statut_gateway = trx.get('status')
    if statut_gateway == 'complete':
        with db_transaction.atomic():
            for ligne in vente.lignes.all():
                MouvementStock.objects.create(
                    medicament=ligne.medicament,
                    type_mouvement='sortie',
                    quantite=ligne.quantite,
                    motif=f"Vente {vente.reference}",
                    utilisateur=vente.vendeur,
                )
            vente.statut = 'validee'
            vente.montant_paye = vente.montant_total
            vente.save()
    elif statut_gateway in ('failed', 'expired', 'canceled', 'cancelled', 'declined'):
        vente.statut = 'annulee'
        vente.save()

    return Response(VenteSerializer(vente).data)
