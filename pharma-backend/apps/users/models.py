from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    ROLES = [
        ('admin', 'Administrateur'),
        ('pharmacien', 'Pharmacien'),
        ('caissier', 'Caissier'),
    ]

    role = models.CharField(max_length=20, choices=ROLES, default='pharmacien')
    telephone = models.CharField(max_length=15, blank=True)
    est_actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def est_admin(self):
        return self.role == 'admin'
