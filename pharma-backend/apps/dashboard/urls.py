from django.urls import path
from . import views

urlpatterns = [
    path('stats/', views.stats_dashboard, name='dashboard-stats'),
]
