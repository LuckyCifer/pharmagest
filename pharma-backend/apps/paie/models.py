from django.db import models
from apps.users.models import Utilisateur


class FichePaie(models.Model):
    MODES_PAIEMENT = [
        ('especes', 'Espèces'),
        ('mobile_money', 'Mobile Money (MTN/Orange)'),
        ('virement', 'Virement bancaire'),
    ]
    STATUTS = [
        ('en_attente', 'En attente'),
        ('payee', 'Payée'),
    ]

    employe = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='fiches_paie')
    mois = models.IntegerField(help_text="1 à 12")
    annee = models.IntegerField()
    salaire_base = models.DecimalField(max_digits=12, decimal_places=0, help_text="Prix en FCFA")
    primes = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Prix en FCFA")
    deductions = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Prix en FCFA")
    montant_net = models.DecimalField(max_digits=12, decimal_places=0, editable=False, default=0)
    mode_paiement = models.CharField(max_length=20, choices=MODES_PAIEMENT, default='mobile_money')
    statut = models.CharField(max_length=20, choices=STATUTS, default='en_attente')
    date_paiement = models.DateTimeField(null=True, blank=True)
    observations = models.TextField(blank=True)
    cree_par = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, related_name='fiches_paie_creees')
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Fiche de paie'
        verbose_name_plural = 'Fiches de paie'
        ordering = ['-annee', '-mois']
        unique_together = ['employe', 'mois', 'annee']

    def __str__(self):
        return f"{self.employe} - {self.mois}/{self.annee}"

    def save(self, *args, **kwargs):
        self.montant_net = self.salaire_base + self.primes - self.deductions
        super().save(*args, **kwargs)
