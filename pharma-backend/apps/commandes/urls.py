from django.urls import path
from . import views

urlpatterns = [
    path('', views.CommandeListCreateView.as_view(), name='commandes-list'),
    path('suggestions/', views.suggestions_reappro, name='commandes-suggestions'),
    path('<int:pk>/', views.CommandeDetailView.as_view(), name='commande-detail'),
    path('<int:pk>/recevoir/', views.recevoir_commande, name='commande-recevoir'),
    path('<int:pk>/annuler/', views.annuler_commande, name='commande-annuler'),
]
