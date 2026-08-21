from django.urls import path
from . import views

urlpatterns = [
    path('', views.FichePaieListCreateView.as_view(), name='paie-list'),
    path('<int:pk>/', views.FichePaieDetailView.as_view(), name='paie-detail'),
    path('<int:pk>/marquer-payee/', views.marquer_payee, name='paie-marquer-payee'),
]
