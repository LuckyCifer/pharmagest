from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.permissions import IsAdminUser
from .models import Utilisateur
from .serializers import (
    UtilisateurSerializer, UtilisateurCreateSerializer,
    UtilisateurUpdateSerializer, CustomTokenObtainPairSerializer,
    ActiveUserTokenRefreshSerializer,
)


class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class ActiveUserTokenRefreshView(TokenRefreshView):
    serializer_class = ActiveUserTokenRefreshSerializer


class UtilisateurListCreateView(generics.ListCreateAPIView):

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Utilisateur.objects.all().order_by('-date_creation')
        return Utilisateur.objects.filter(est_actif=True)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UtilisateurCreateSerializer
        return UtilisateurSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]


class UtilisateurDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Utilisateur.objects.all()
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UtilisateurUpdateSerializer
        return UtilisateurSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response(
                {'detail': 'Impossible de désactiver votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.est_actif = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profil_view(request):
    serializer = UtilisateurSerializer(request.user)
    return Response(serializer.data)
