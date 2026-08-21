from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth JWT
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Apps
    path('api/users/', include('apps.users.urls')),
    path('api/medicaments/', include('apps.medicaments.urls')),
    path('api/stocks/', include('apps.stocks.urls')),
    path('api/ventes/', include('apps.ventes.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/paie/', include('apps.paie.urls')),
    path('api/commandes/', include('apps.commandes.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
