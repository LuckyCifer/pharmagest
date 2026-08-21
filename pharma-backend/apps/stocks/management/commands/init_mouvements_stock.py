from django.core.management.base import BaseCommand
from django.db.models import Count
from apps.medicaments.models import Medicament
from apps.stocks.models import MouvementStock


class Command(BaseCommand):
    help = "Crée un mouvement 'Stock initial' pour chaque médicament n'en ayant aucun"

    def handle(self, *args, **options):
        # Médicaments sans aucun mouvement de stock
        meds = (
            Medicament.objects
            .annotate(nb=Count('mouvements'))
            .filter(nb=0, est_actif=True)
        )
        count = meds.count()

        if count == 0:
            self.stdout.write('Tous les médicaments ont déjà des mouvements.')
            return

        # bulk_create contourne MouvementStock.save() → les quantités restent intactes
        mouvements = [
            MouvementStock(
                medicament=med,
                type_mouvement='ajustement',
                quantite=med.quantite_stock,
                quantite_avant=0,
                quantite_apres=med.quantite_stock,
                motif='Stock initial (import)',
            )
            for med in meds
        ]
        MouvementStock.objects.bulk_create(mouvements)

        self.stdout.write(
            self.style.SUCCESS(f'{count} mouvement(s) initiaux créés.')
        )
