from django.db import models
from apps.medicaments.models import Medicament
from apps.users.models import Utilisateur


class Vente(models.Model):
    MODES_PAIEMENT = [
        ('especes', 'Espèces'),
        ('mobile_money', 'Mobile Money (MTN/Orange)'),
        ('carte', 'Carte bancaire'),
        ('credit', 'Crédit'),
    ]

    STATUTS = [
        ('en_attente', 'En attente'),
        ('validee', 'Validée'),
        ('annulee', 'Annulée'),
    ]

    OPERATEURS = [
        ('mtn', 'MTN'),
        ('orange', 'Orange'),
    ]

    reference = models.CharField(max_length=20, unique=True, editable=False)
    client_nom = models.CharField(max_length=150, blank=True, default='Client anonyme')
    client_telephone = models.CharField(max_length=15, blank=True)
    montant_total = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="TTC")
    montant_ht = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    montant_tva = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    montant_paye = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    mode_paiement = models.CharField(max_length=20, choices=MODES_PAIEMENT, default='especes')
    operateur = models.CharField(max_length=10, choices=OPERATEURS, blank=True, help_text="Opérateur Mobile Money (NotchPay)")
    reference_paiement = models.CharField(max_length=100, blank=True, help_text="Référence de transaction NotchPay")
    statut = models.CharField(max_length=20, choices=STATUTS, default='validee')
    observations = models.TextField(blank=True)
    vendeur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, related_name='ventes')
    date_vente = models.DateTimeField(auto_now_add=True)

    # Ordonnance médicale (optionnelle — non bloquante pour la dispensation)
    numero_ordonnance = models.CharField(max_length=50, blank=True, default='')
    prescripteur_nom = models.CharField(max_length=150, blank=True, default='')
    prescripteur_ordre = models.CharField(max_length=50, blank=True, help_text="N° d'ordre ONMC du médecin")
    ordonnance_date = models.DateField(null=True, blank=True)
    ordonnance_scan = models.FileField(upload_to='ordonnances/%Y/%m/', null=True, blank=True)

    class Meta:
        verbose_name = 'Vente'
        verbose_name_plural = 'Ventes'
        ordering = ['-date_vente']

    def __str__(self):
        return f"Vente {self.reference} - {self.montant_total} FCFA"

    @property
    def monnaie_rendue(self):
        return max(0, int(self.montant_paye) - int(self.montant_total))

    def save(self, *args, **kwargs):
        if not self.reference:
            from django.utils import timezone
            prefixe = f"VT{timezone.localtime(timezone.now()).strftime('%Y%m%d')}"
            # Numéro suivant la plus grande référence du jour (et non le nombre de ventes) :
            # reste unique même si une vente du jour a été supprimée.
            derniere = Vente.objects.filter(reference__startswith=prefixe).order_by('-reference').values_list('reference', flat=True).first()
            numero = int(derniere[len(prefixe):]) + 1 if derniere else 1
            self.reference = f"{prefixe}{numero:04d}"
        super().save(*args, **kwargs)


class LigneVente(models.Model):
    vente = models.ForeignKey(Vente, on_delete=models.CASCADE, related_name='lignes')
    medicament = models.ForeignKey(Medicament, on_delete=models.PROTECT, related_name='lignes_vente')
    quantite = models.IntegerField()
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=0)
    sous_total = models.DecimalField(max_digits=14, decimal_places=0, help_text="TTC")
    taux_tva = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    montant_ht = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    montant_tva = models.DecimalField(max_digits=14, decimal_places=0, default=0)

    class Meta:
        verbose_name = 'Ligne de vente'
        verbose_name_plural = 'Lignes de vente'

    def __str__(self):
        return f"{self.medicament.nom} x{self.quantite}"

    def save(self, *args, **kwargs):
        self.sous_total = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)
