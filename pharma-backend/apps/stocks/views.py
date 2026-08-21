from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.permissions import IsAdminOrPharmacien
from .models import MouvementStock, Alerte
from .serializers import MouvementStockSerializer, AlerteSerializer


class MouvementStockListCreateView(generics.ListCreateAPIView):
    queryset = MouvementStock.objects.select_related('medicament', 'utilisateur').all()
    serializer_class = MouvementStockSerializer

    def get_permissions(self):
        # Lecture : tout le monde ; Création : admin ou pharmacien
        if self.request.method == 'POST':
            return [IsAdminOrPharmacien()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        medicament_id = self.request.query_params.get('medicament')
        if medicament_id:
            qs = qs.filter(medicament_id=medicament_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)


class AlerteListView(generics.ListAPIView):
    serializer_class = AlerteSerializer
    # Alertes visibles uniquement par admin et pharmacien
    permission_classes = [IsAdminOrPharmacien]

    def get_queryset(self):
        qs = Alerte.objects.select_related('medicament').filter(est_resolue=False)
        type_alerte = self.request.query_params.get('type')
        if type_alerte:
            qs = qs.filter(type_alerte=type_alerte)
        return qs


@api_view(['PATCH'])
@permission_classes([IsAdminOrPharmacien])
def resoudre_alerte(request, pk):
    from django.utils import timezone
    try:
        alerte = Alerte.objects.get(pk=pk)
        alerte.est_resolue = True
        alerte.date_resolution = timezone.now()
        alerte.save()
        return Response({'message': 'Alerte résolue'})
    except Alerte.DoesNotExist:
        return Response({'error': 'Alerte non trouvée'}, status=status.HTTP_404_NOT_FOUND)
