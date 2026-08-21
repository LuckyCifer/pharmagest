from django.db import models
from django.utils import timezone
from datetime import timedelta


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Catégorie'
        verbose_name_plural = 'Catégories'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Fournisseur(models.Model):
    nom = models.CharField(max_length=150)
    contact = models.CharField(max_length=100, blank=True)
    telephone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    adresse = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Fournisseur'
        verbose_name_plural = 'Fournisseurs'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Medicament(models.Model):
    FORMES = [
        ('comprime', 'Comprimé'),
        ('sirop', 'Sirop'),
        ('injectable', 'Injectable'),
        ('capsule', 'Capsule'),
        ('pommade', 'Pommade'),
        ('autre', 'Autre'),
    ]

    TYPES_PRODUIT = [
        ('medicament', 'Médicament'),
        ('parapharmacie', 'Parapharmacie'),
    ]

    nom = models.CharField(max_length=200)
    denomination_commune = models.CharField(max_length=200, blank=True, help_text="DCI / nom générique")
    forme = models.CharField(max_length=20, choices=FORMES, default='comprime')
    type_produit = models.CharField(max_length=20, choices=TYPES_PRODUIT, default='medicament', help_text="Détermine l'exonération de TVA (médicament = exonéré)")
    dosage = models.CharField(max_length=50, blank=True, help_text="Ex: 500mg, 250mg/5ml")
    categorie = models.ForeignKey(Categorie, on_delete=models.SET_NULL, null=True, related_name='medicaments')
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True, blank=True, related_name='medicaments')
    numero_lot = models.CharField(max_length=50, blank=True)
    date_fabrication = models.DateField(null=True, blank=True)
    date_peremption = models.DateField(null=True, blank=True)
    prix_achat = models.DecimalField(max_digits=12, decimal_places=0, help_text="Prix en FCFA")
    prix_vente = models.DecimalField(max_digits=12, decimal_places=0, help_text="Prix en FCFA")
    quantite_stock = models.IntegerField(default=0)
    seuil_alerte = models.IntegerField(default=10, help_text="Quantité minimale avant alerte")
    description = models.TextField(blank=True)
    est_actif = models.BooleanField(default=True)
    sous_controle_dpml = models.BooleanField(default=False, help_text="Tramadol, dermocorticoïdes — circulaires DPML déc. 2019")
    motif_controle = models.CharField(max_length=100, blank=True, help_text="Ex : Tramadol, Dermocorticoïde, Psychotrope")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Médicament'
        verbose_name_plural = 'Médicaments'
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} {self.dosage}".strip()

    @property
    def statut_stock(self):
        if self.quantite_stock == 0:
            return 'rupture'
        elif self.quantite_stock <= self.seuil_alerte:
            return 'critique'
        return 'normal'

    @property
    def statut_peremption(self):
        if not self.date_peremption:
            return 'inconnu'
        aujourd_hui = timezone.now().date()
        delta = (self.date_peremption - aujourd_hui).days
        if delta < 0:
            return 'perime'
        elif delta <= 7:
            return 'urgent'
        elif delta <= 30:
            return 'bientot'
        return 'valide'

    @property
    def jours_avant_peremption(self):
        if not self.date_peremption:
            return None
        return (self.date_peremption - timezone.now().date()).days

    @property
    def marge_beneficiaire(self):
        if self.prix_achat and self.prix_achat > 0:
            return round(((self.prix_vente - self.prix_achat) / self.prix_achat) * 100, 1)
        return 0
