from django.urls import path
from . import views

urlpatterns = [
    path('', views.MedicamentListCreateView.as_view(), name='medicaments-list'),
    path('<int:pk>/', views.MedicamentDetailView.as_view(), name='medicament-detail'),
    path('alertes/', views.medicaments_alertes, name='medicaments-alertes'),
    path('registre-controle/', views.registre_controle, name='medicaments-registre-controle'),
    path('categories/', views.CategorieListCreateView.as_view(), name='categories-list'),
    path('categories/<int:pk>/', views.CategorieDetailView.as_view(), name='categorie-detail'),
    path('fournisseurs/', views.FournisseurListCreateView.as_view(), name='fournisseurs-list'),
    path('fournisseurs/<int:pk>/', views.FournisseurDetailView.as_view(), name='fournisseur-detail'),
]
