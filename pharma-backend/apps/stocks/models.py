from django.db import models
from apps.medicaments.models import Medicament
from apps.users.models import Utilisateur


class MouvementStock(models.Model):
    TYPES = [
        ('entree', 'Entrée en stock'),
        ('sortie', 'Sortie de stock'),
        ('ajustement', 'Ajustement d\'inventaire'),
        ('retour', 'Retour fournisseur'),
        ('perte', 'Perte / périmé'),
    ]

    medicament = models.ForeignKey(Medicament, on_delete=models.CASCADE, related_name='mouvements')
    type_mouvement = models.CharField(max_length=20, choices=TYPES)
    quantite = models.IntegerField()
    quantite_avant = models.IntegerField()
    quantite_apres = models.IntegerField()
    motif = models.TextField(blank=True)
    reference = models.CharField(max_length=100, blank=True, help_text="N° bon de livraison, facture...")
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, related_name='mouvements')
    date_mouvement = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Mouvement de stock'
        verbose_name_plural = 'Mouvements de stock'
        ordering = ['-date_mouvement']

    def __str__(self):
        return f"{self.get_type_mouvement_display()} - {self.medicament.nom} ({self.quantite})"

    def save(self, *args, **kwargs):
        # Mettre à jour le stock du médicament
        med = self.medicament
        self.quantite_avant = med.quantite_stock
        if self.type_mouvement == 'entree':
            med.quantite_stock += self.quantite
        elif self.type_mouvement in ['sortie', 'perte', 'retour']:
            med.quantite_stock = max(0, med.quantite_stock - self.quantite)
        elif self.type_mouvement == 'ajustement':
            med.quantite_stock = self.quantite
        self.quantite_apres = med.quantite_stock
        med.save()
        super().save(*args, **kwargs)
        from .utils import verifier_alertes
        verifier_alertes(med)


class Alerte(models.Model):
    TYPES_ALERTE = [
        ('stock_critique', 'Stock critique'),
        ('rupture', 'Rupture de stock'),
        ('peremption_urgente', 'Péremption urgente (< 7j)'),
        ('peremption_proche', 'Péremption proche (< 30j)'),
        ('perime', 'Médicament périmé'),
    ]

    medicament = models.ForeignKey(Medicament, on_delete=models.CASCADE, related_name='alertes')
    type_alerte = models.CharField(max_length=30, choices=TYPES_ALERTE)
    message = models.TextField()
    est_resolue = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_resolution = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Alerte'
        verbose_name_plural = 'Alertes'
        ordering = ['-date_creation']

    def __str__(self):
        return f"{self.get_type_alerte_display()} - {self.medicament.nom}"
