from datetime import timedelta
from django.db import models
from django.utils import timezone
from apps.medicaments.models import Medicament, Fournisseur
from apps.users.models import Utilisateur


class CommandeFournisseur(models.Model):
    STATUTS = [
        ('envoyee', 'Envoyée'),
        ('recue_partielle', 'Reçue partiellement'),
        ('recue', 'Reçue'),
        ('annulee', 'Annulée'),
    ]

    reference = models.CharField(max_length=20, unique=True, editable=False)
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, related_name='commandes')
    statut = models.CharField(max_length=20, choices=STATUTS, default='envoyee')
    reference_livraison = models.CharField(max_length=100, blank=True, help_text="N° bon de livraison fournisseur")
    observations = models.TextField(blank=True)
    cree_par = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, related_name='commandes_creees')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_reception = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Commande fournisseur'
        verbose_name_plural = 'Commandes fournisseurs'
        ordering = ['-date_creation']

    def __str__(self):
        return f"Commande {self.reference} - {self.fournisseur.nom}"

    def save(self, *args, **kwargs):
        if not self.reference:
            now = timezone.localtime(timezone.now())
            debut_jour = now.replace(hour=0, minute=0, second=0, microsecond=0)
            fin_jour = debut_jour + timedelta(days=1)
            # Bornes explicites (pas de lookup __date) : évite de dépendre de CONVERT_TZ()
            # côté MySQL, dont les tables de fuseaux horaires ne sont pas toujours chargées.
            count = CommandeFournisseur.objects.filter(
                date_creation__gte=debut_jour, date_creation__lt=fin_jour
            ).count() + 1
            self.reference = f"BC{now.strftime('%Y%m%d')}{count:04d}"
        super().save(*args, **kwargs)


class LigneCommande(models.Model):
    commande = models.ForeignKey(CommandeFournisseur, on_delete=models.CASCADE, related_name='lignes')
    medicament = models.ForeignKey(Medicament, on_delete=models.PROTECT, related_name='lignes_commande')
    quantite_commandee = models.IntegerField()
    quantite_recue = models.IntegerField(default=0)
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=0, help_text="Prix d'achat en FCFA")
    numero_lot = models.CharField(max_length=50, blank=True)
    date_peremption = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = 'Ligne de commande'
        verbose_name_plural = 'Lignes de commande'

    def __str__(self):
        return f"{self.medicament.nom} x{self.quantite_commandee}"

    @property
    def sous_total(self):
        return self.quantite_commandee * self.prix_unitaire
