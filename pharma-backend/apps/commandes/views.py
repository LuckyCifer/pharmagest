from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models as django_models
from django.utils import timezone
from django.utils.dateparse import parse_date
from apps.permissions import IsAdminUser, IsAdminOrPharmacien
from apps.medicaments.models import Medicament
from apps.medicaments.serializers import MedicamentSerializer
from apps.stocks.models import MouvementStock
from .models import CommandeFournisseur, LigneCommande
from .serializers import CommandeFournisseurSerializer


class CommandeListCreateView(generics.ListCreateAPIView):
    queryset = CommandeFournisseur.objects.select_related('fournisseur', 'cree_par').prefetch_related('lignes__medicament').all()
    serializer_class = CommandeFournisseurSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        fournisseur = self.request.query_params.get('fournisseur')
        if fournisseur:
            qs = qs.filter(fournisseur_id=fournisseur)
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class CommandeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CommandeFournisseur.objects.select_related('fournisseur', 'cree_par').prefetch_related('lignes__medicament').all()
    serializer_class = CommandeFournisseurSerializer

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdminUser()]
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]


@api_view(['PATCH'])
@permission_classes([IsAdminOrPharmacien])
def recevoir_commande(request, pk):
    try:
        commande = CommandeFournisseur.objects.prefetch_related('lignes__medicament').get(pk=pk)
    except CommandeFournisseur.DoesNotExist:
        return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

    if commande.statut != 'envoyee':
        # Réception en une seule fois : si la commande est déjà (partiellement) reçue
        # ou annulée, il faut créer une nouvelle commande pour le reliquat.
        return Response({'error': 'Cette commande a déjà été reçue ou est annulée.'}, status=status.HTTP_400_BAD_REQUEST)

    lignes_payload = {str(l['id']): l for l in request.data.get('lignes', [])}
    lignes_par_id = {l.id: l for l in commande.lignes.all()}

    complete = True
    au_moins_une = False

    for ligne_id, ligne in lignes_par_id.items():
        payload = lignes_payload.get(str(ligne_id))
        if not payload:
            if ligne.quantite_recue < ligne.quantite_commandee:
                complete = False
            continue

        quantite_recue = int(payload.get('quantite_recue') or 0)
        if quantite_recue > 0:
            au_moins_une = True
            ligne.quantite_recue = quantite_recue
            ligne.numero_lot = payload.get('numero_lot', ligne.numero_lot)
            if payload.get('date_peremption'):
                ligne.date_peremption = parse_date(payload['date_peremption'])
            if payload.get('prix_unitaire'):
                ligne.prix_unitaire = payload['prix_unitaire']
            ligne.save()

            MouvementStock.objects.create(
                medicament=ligne.medicament,
                type_mouvement='entree',
                quantite=quantite_recue,
                reference=commande.reference,
                motif=f"Réception commande {commande.reference}",
                utilisateur=request.user,
            )

            medicament = ligne.medicament
            if ligne.numero_lot:
                medicament.numero_lot = ligne.numero_lot
            if ligne.date_peremption:
                medicament.date_peremption = ligne.date_peremption
            if ligne.prix_unitaire:
                medicament.prix_achat = ligne.prix_unitaire
            medicament.save()

        if ligne.quantite_recue < ligne.quantite_commandee:
            complete = False

    if not au_moins_une:
        return Response({'error': "Aucune quantité reçue n'a été renseignée."}, status=status.HTTP_400_BAD_REQUEST)

    commande.reference_livraison = request.data.get('reference_livraison', commande.reference_livraison)
    commande.date_reception = timezone.now()
    commande.statut = 'recue' if complete else 'recue_partielle'
    commande.save()

    return Response(CommandeFournisseurSerializer(commande).data)


@api_view(['PATCH'])
@permission_classes([IsAdminOrPharmacien])
def annuler_commande(request, pk):
    try:
        commande = CommandeFournisseur.objects.get(pk=pk)
    except CommandeFournisseur.DoesNotExist:
        return Response({'error': 'Commande non trouvée'}, status=status.HTTP_404_NOT_FOUND)

    if commande.statut != 'envoyee':
        return Response({'error': 'Seule une commande non reçue peut être annulée.'}, status=status.HTTP_400_BAD_REQUEST)

    commande.statut = 'annulee'
    commande.save()
    return Response(CommandeFournisseurSerializer(commande).data)


@api_view(['GET'])
@permission_classes([IsAdminOrPharmacien])
def suggestions_reappro(request):
    qs = Medicament.objects.filter(est_actif=True).filter(
        django_models.Q(quantite_stock=0) | django_models.Q(quantite_stock__lte=django_models.F('seuil_alerte'))
    )
    fournisseur = request.query_params.get('fournisseur')
    if fournisseur:
        qs = qs.filter(fournisseur_id=fournisseur)

    medicaments = list(qs)
    data = MedicamentSerializer(medicaments, many=True).data
    for item, med in zip(data, medicaments):
        item['quantite_suggeree'] = max(1, med.seuil_alerte * 2 - med.quantite_stock)
    return Response(data)
