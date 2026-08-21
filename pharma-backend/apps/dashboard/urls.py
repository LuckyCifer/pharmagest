from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.stats_dashboard, name='dashboard-stats'),
    path('rapport-mensuel/', views.rapport_mensuel, name='dashboard-rapport-mensuel'),
]
