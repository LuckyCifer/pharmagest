from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from apps.permissions import IsAdminUser, IsAdminOrPharmacien
from .models import Medicament, Categorie, Fournisseur
from .serializers import MedicamentSerializer, CategorieSerializer, FournisseurSerializer


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
