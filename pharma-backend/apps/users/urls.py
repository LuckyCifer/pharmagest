from django.urls import path
from . import views

urlpatterns = [
    path('', views.UtilisateurListCreateView.as_view(), name='users-list'),
    path('<int:pk>/', views.UtilisateurDetailView.as_view(), name='user-detail'),
    path('profil/', views.profil_view, name='profil'),
]
