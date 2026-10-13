from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from apps.permissions import IsAdminUser, IsAdminOrPharmacien, IsAdminOrPharmacienOrCaissier
from .models import FichePaie
from .serializers import FichePaieSerializer


def _fiches_visibles(user):
    """Un caissier n'accède qu'à ses propres fiches ; admin et pharmacien à toutes."""
    qs = FichePaie.objects.select_related('employe', 'cree_par')
    if user.role == 'caissier':
        qs = qs.filter(employe=user)
    return qs


class FichePaieListCreateView(generics.ListCreateAPIView):
    serializer_class = FichePaieSerializer

    def get_permissions(self):
        # Lecture : tout le personnel (admin, pharmacien, caissier) ; Création : admin ou pharmacien
        if self.request.method == 'POST':
            return [IsAdminOrPharmacien()]
        return [IsAdminOrPharmacienOrCaissier()]

    def get_queryset(self):
        qs = _fiches_visibles(self.request.user)
        mois = self.request.query_params.get('mois')
        annee = self.request.query_params.get('annee')
        employe = self.request.query_params.get('employe')
        if mois:
            qs = qs.filter(mois=mois)
        if annee:
            qs = qs.filter(annee=annee)
        if employe:
            qs = qs.filter(employe_id=employe)
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class FichePaieDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FichePaieSerializer

    def get_queryset(self):
        return _fiches_visibles(self.request.user)

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdminUser()]
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminOrPharmacien()]
        return [IsAdminOrPharmacienOrCaissier()]


@api_view(['PATCH'])
@permission_classes([IsAdminOrPharmacien])
def marquer_payee(request, pk):
    from django.utils import timezone
    try:
        fiche = _fiches_visibles(request.user).get(pk=pk)
        fiche.statut = 'payee'
        fiche.date_paiement = timezone.now()
        fiche.save()
        return Response(FichePaieSerializer(fiche).data)
    except FichePaie.DoesNotExist:
        return Response({'error': 'Fiche de paie non trouvée'}, status=status.HTTP_404_NOT_FOUND)
