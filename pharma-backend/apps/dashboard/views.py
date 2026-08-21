from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from apps.medicaments.models import Medicament
from apps.ventes.models import Vente
from apps.stocks.models import Alerte


def _bornes_jour(reference, jour):
    """Bornes datetime [début, fin) d'un jour donné, en heure locale.

    Évite les lookups __date (ex: date_vente__date=...), qui dépendent de
    CONVERT_TZ() côté MySQL — indisponible si les tables de fuseaux horaires
    ne sont pas chargées sur le serveur (voir Vente.save()).
    """
    debut = reference.replace(year=jour.year, month=jour.month, day=jour.day, hour=0, minute=0, second=0, microsecond=0)
    return debut, debut + timedelta(days=1)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_dashboard(request):
    now_local = timezone.localtime(timezone.now())
    aujourd_hui = now_local.date()
    debut_mois = aujourd_hui.replace(day=1)

    debut_jour, fin_jour = _bornes_jour(now_local, aujourd_hui)
    debut_mois_dt, _ = _bornes_jour(now_local, debut_mois)

    # Stats médicaments
    total_medicaments = Medicament.objects.filter(est_actif=True).count()
    ruptures = Medicament.objects.filter(est_actif=True, quantite_stock=0).count()
    critiques = Medicament.objects.filter(est_actif=True, quantite_stock__gt=0, quantite_stock__lte=models.F('seuil_alerte')).count()
    perimes = Medicament.objects.filter(est_actif=True, date_peremption__lt=aujourd_hui).count()
    bientot_perimes = Medicament.objects.filter(
        est_actif=True,
        date_peremption__gte=aujourd_hui,
        date_peremption__lte=aujourd_hui + timedelta(days=30)
    ).count()

    # Stats ventes
    ventes_aujourd_hui = Vente.objects.filter(date_vente__gte=debut_jour, date_vente__lt=fin_jour, statut='validee')
    ventes_mois = Vente.objects.filter(date_vente__gte=debut_mois_dt, statut='validee')

    ca_aujourd_hui = ventes_aujourd_hui.aggregate(total=Sum('montant_total'))['total'] or 0
    ca_mois = ventes_mois.aggregate(total=Sum('montant_total'))['total'] or 0
    nb_ventes_aujourd_hui = ventes_aujourd_hui.count()

    # Alertes non résolues
    nb_alertes = Alerte.objects.filter(est_resolue=False).count()

    # Ventes des 7 derniers jours (pour graphique)
    ventes_7j = []
    for i in range(6, -1, -1):
        jour = aujourd_hui - timedelta(days=i)
        debut_j, fin_j = _bornes_jour(now_local, jour)
        ventes_jour = Vente.objects.filter(date_vente__gte=debut_j, date_vente__lt=fin_j, statut='validee')
        ca = ventes_jour.aggregate(total=Sum('montant_total'))['total'] or 0
        ventes_7j.append({
            'date': jour.strftime('%d/%m'),
            'chiffre_affaires': int(ca),
            'nombre_ventes': ventes_jour.count()
        })

    # Top 5 médicaments les plus vendus ce mois
    from apps.ventes.models import LigneVente
    top_medicaments = LigneVente.objects.filter(
        vente__date_vente__gte=debut_mois_dt,
        vente__statut='validee'
    ).values('medicament__nom').annotate(
        total_vendu=Sum('quantite'),
        chiffre_affaires=Sum('sous_total')
    ).order_by('-total_vendu')[:5]

    return Response({
        'medicaments': {
            'total': total_medicaments,
            'ruptures': ruptures,
            'critiques': critiques,
            'perimes': perimes,
            'bientot_perimes': bientot_perimes,
        },
        'ventes': {
            'ca_aujourd_hui': int(ca_aujourd_hui),
            'ca_mois': int(ca_mois),
            'nb_ventes_aujourd_hui': nb_ventes_aujourd_hui,
            'nb_alertes': nb_alertes,
        },
        'graphique_7j': ventes_7j,
        'top_medicaments': list(top_medicaments),
    })
