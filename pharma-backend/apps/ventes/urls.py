from django.urls import path
from . import views

urlpatterns = [
    path('', views.VenteListCreateView.as_view(), name='ventes-list'),
    path('<int:pk>/', views.VenteDetailView.as_view(), name='vente-detail'),
    path('export/csv/', views.export_ventes_csv, name='ventes-export-csv'),
    path('<int:pk>/statut-paiement/', views.statut_paiement, name='vente-statut-paiement'),
]
