from django.core.management.base import BaseCommand
from apps.medicaments.models import Medicament
from apps.stocks.utils import verifier_alertes


class Command(BaseCommand):
    help = 'Génère les alertes manquantes pour tous les médicaments'

    def handle(self, *args, **options):
        meds = Medicament.objects.filter(est_actif=True)
        total = meds.count()
        self.stdout.write(f'Verification de {total} medicaments...')

        for med in meds:
            verifier_alertes(med)

        from apps.stocks.models import Alerte
        nb = Alerte.objects.filter(est_resolue=False).count()
        self.stdout.write(self.style.SUCCESS(f'Termine. {nb} alerte(s) active(s) en base.'))
