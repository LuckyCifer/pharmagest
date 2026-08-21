from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from django.utils import timezone
from apps.permissions import IsAdminUser, IsAdminOrPharmacien
from .models import Medicament, Categorie, Fournisseur
from .serializers import MedicamentSerializer, CategorieSerializer, FournisseurSerializer


def _bornes_mois(annee, mois):
    """Bornes datetime [début, fin) d'un mois donné, en heure locale.

    Même principe tz-safe que _bornes_jour (apps/dashboard/views.py) : on évite
    les lookups __month/__year, qui dépendent de CONVERT_TZ() côté MySQL —
    indisponible si les tables de fuseaux horaires ne sont pas chargées sur le serveur.
    """
    debut = timezone.localtime(timezone.now()).replace(year=annee, month=mois, day=1, hour=0, minute=0, second=0, microsecond=0)
    if mois == 12:
        fin = debut.replace(year=annee + 1, month=1)
    else:
        fin = debut.replace(month=mois + 1)
    return debut, fin


class CategorieListCreateView(generics.ListCreateAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        # Tout le monde peut consulter, seuls admin/pharmacien peuvent créer
        if self.request.method == 'POST':
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]


class CategorieDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]


class FournisseurListCreateView(generics.ListCreateAPIView):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]


class FournisseurDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]


class MedicamentListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicamentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'denomination_commune', 'numero_lot']
    ordering_fields = ['nom', 'quantite_stock', 'date_peremption', 'prix_vente']

    def get_permissions(self):
        # Tout le monde peut consulter, seuls admin/pharmacien peuvent créer
        if self.request.method == 'POST':
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]

    def get_queryset(self):
        from django.utils import timezone
        from datetime import timedelta

        qs = Medicament.objects.filter(est_actif=True).select_related('categorie', 'fournisseur')
        categorie = self.request.query_params.get('categorie')
        if categorie:
            qs = qs.filter(categorie_id=categorie)

        forme = self.request.query_params.get('forme')
        if forme:
            qs = qs.filter(forme=forme)

        type_produit = self.request.query_params.get('type_produit')
        if type_produit:
            qs = qs.filter(type_produit=type_produit)

        sous_controle = self.request.query_params.get('sous_controle')
        if sous_controle == 'true':
            qs = qs.filter(sous_controle_dpml=True)
        elif sous_controle == 'false':
            qs = qs.filter(sous_controle_dpml=False)

        # Filtres appliqués avant pagination (statut_stock/statut_peremption sont des
        # propriétés Python calculées, donc traduites ici en équivalents ORM).
        statut_stock = self.request.query_params.get('statut_stock')
        if statut_stock == 'rupture':
            qs = qs.filter(quantite_stock=0)
        elif statut_stock == 'critique':
            qs = qs.filter(quantite_stock__gt=0, quantite_stock__lte=models.F('seuil_alerte'))
        elif statut_stock == 'normal':
            qs = qs.filter(quantite_stock__gt=models.F('seuil_alerte'))

        statut_peremption = self.request.query_params.get('statut_peremption')
        if statut_peremption:
            aujourd_hui = timezone.now().date()
            if statut_peremption == 'inconnu':
                qs = qs.filter(date_peremption__isnull=True)
            elif statut_peremption == 'perime':
                qs = qs.filter(date_peremption__lt=aujourd_hui)
            elif statut_peremption == 'urgent':
                qs = qs.filter(date_peremption__gte=aujourd_hui, date_peremption__lte=aujourd_hui + timedelta(days=7))
            elif statut_peremption == 'bientot':
                qs = qs.filter(date_peremption__gt=aujourd_hui + timedelta(days=7), date_peremption__lte=aujourd_hui + timedelta(days=30))
            elif statut_peremption == 'valide':
                qs = qs.filter(date_peremption__gt=aujourd_hui + timedelta(days=30))

        return qs


class MedicamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Medicament.objects.all()
    serializer_class = MedicamentSerializer

    def get_permissions(self):
        # Suppression : admin uniquement
        if self.request.method == 'DELETE':
            return [IsAdminUser()]
        # Modification : admin ou pharmacien
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminOrPharmacien()]
        # Lecture : tout le monde
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.est_actif = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def medicaments_alertes(request):
    from django.utils import timezone
    from datetime import timedelta
    aujourd_hui = timezone.now().date()
    dans_30j = aujourd_hui + timedelta(days=30)

    rupture = Medicament.objects.filter(est_actif=True, quantite_stock=0)
    critique = Medicament.objects.filter(est_actif=True, quantite_stock__gt=0, quantite_stock__lte=models.F('seuil_alerte'))
    peremption = Medicament.objects.filter(est_actif=True, date_peremption__lte=dans_30j, date_peremption__gte=aujourd_hui)
    perimes = Medicament.objects.filter(est_actif=True, date_peremption__lt=aujourd_hui)

    return Response({
        'rupture': MedicamentSerializer(rupture, many=True).data,
        'critique': MedicamentSerializer(critique, many=True).data,
        'peremption_proche': MedicamentSerializer(peremption, many=True).data,
        'perimes': MedicamentSerializer(perimes, many=True).data,
        'total_alertes': rupture.count() + critique.count() + peremption.count() + perimes.count()
    })


@api_view(['GET'])
@permission_classes([IsAdminOrPharmacien])
def registre_controle(request):
    import csv
    from django.http import HttpResponse
    from apps.stocks.models import MouvementStock
    from apps.ventes.models import Vente

    mois_param = request.query_params.get('mois')
    now_local = timezone.localtime(timezone.now())
    if mois_param:
        try:
            annee, mois = map(int, mois_param.split('-'))
        except (ValueError, AttributeError):
            return Response({'error': "Paramètre 'mois' invalide, format attendu AAAA-MM."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        annee, mois = now_local.year, now_local.month

    debut, fin = _bornes_mois(annee, mois)
    periode = f"{annee:04d}-{mois:02d}"

    medicaments_controle = Medicament.objects.filter(sous_controle_dpml=True, est_actif=True)

    mouvements_qs = MouvementStock.objects.filter(
        medicament__sous_controle_dpml=True,
        type_mouvement='sortie',
        date_mouvement__gte=debut, date_mouvement__lt=fin,
    ).select_related('medicament', 'utilisateur').order_by('date_mouvement')

    # Les infos de prescription sont retrouvées via le champ `reference` du mouvement,
    # renseigné pour les ventes depuis le module Ordonnances (voir apps/ventes/serializers.py) —
    # les mouvements antérieurs à ce correctif ou non liés à une vente restent sans prescripteur.
    references = [m.reference for m in mouvements_qs if m.reference]
    ventes_par_ref = {v.reference: v for v in Vente.objects.filter(reference__in=references)}

    mouvements = []
    total_sorties = 0
    for m in mouvements_qs:
        vente = ventes_par_ref.get(m.reference)
        utilisateur_nom = (m.utilisateur.get_full_name() or m.utilisateur.username) if m.utilisateur else ''
        mouvements.append({
            'date': timezone.localtime(m.date_mouvement).strftime('%d/%m/%Y %H:%M'),
            'medicament': m.medicament.nom,
            'motif_controle': m.medicament.motif_controle,
            'type': 'sortie',
            'quantite': m.quantite,
            'reference_ordonnance': vente.numero_ordonnance if vente else '',
            'prescripteur': vente.prescripteur_nom if vente else '',
            'utilisateur': utilisateur_nom,
        })
        total_sorties += m.quantite

    if request.query_params.get('export') == 'csv':
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="registre_dpml_{periode}.csv"'
        response.write('﻿')
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['Date', 'Médicament', 'Motif contrôle', 'Type mouvement', 'Quantité', 'N° ordonnance', 'Prescripteur', 'Utilisateur'])
        for mvt in mouvements:
            writer.writerow([
                mvt['date'], mvt['medicament'], mvt['motif_controle'], mvt['type'],
                mvt['quantite'], mvt['reference_ordonnance'], mvt['prescripteur'], mvt['utilisateur'],
            ])
        return response

    return Response({
        'periode': periode,
        'medicaments_sous_controle': MedicamentSerializer(medicaments_controle, many=True).data,
        'mouvements': mouvements,
        'total_sorties': total_sorties,
    })
