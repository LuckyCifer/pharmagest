from django.urls import path
from . import views

urlpatterns = [
    path('mouvements/', views.MouvementStockListCreateView.as_view(), name='mouvements-list'),
    path('alertes/', views.AlerteListView.as_view(), name='alertes-list'),
    path('alertes/<int:pk>/resoudre/', views.resoudre_alerte, name='alerte-resoudre'),
]
