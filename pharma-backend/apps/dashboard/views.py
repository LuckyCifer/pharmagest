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
from apps.permissions import IsAdminOrPharmacien


def _bornes_jour(reference, jour):
    """Bornes datetime [début, fin) d'un jour donné, en heure locale.

    Évite les lookups __date (ex: date_vente__date=...), qui dépendent de
    CONVERT_TZ() côté MySQL — indisponible si les tables de fuseaux horaires
    ne sont pas chargées sur le serveur (voir Vente.save()).
    """
    debut = reference.replace(year=jour.year, month=jour.month, day=jour.day, hour=0, minute=0, second=0, microsecond=0)
    return debut, debut + timedelta(days=1)


def _bornes_mois(reference, annee, mois):
    """Bornes datetime [début, fin) d'un mois donné, en heure locale.

    Même principe tz-safe que _bornes_jour : évite les lookups __month/__year
    qui dépendent de CONVERT_TZ() côté MySQL.
    """
    debut = reference.replace(year=annee, month=mois, day=1, hour=0, minute=0, second=0, microsecond=0)
    if mois == 12:
        fin = debut.replace(year=annee + 1, month=1)
    else:
        fin = debut.replace(month=mois + 1)
    return debut, fin


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


MOIS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]


@api_view(['GET'])
@permission_classes([IsAdminOrPharmacien])
def rapport_mensuel(request):
    from apps.stocks.models import MouvementStock

    now_local = timezone.localtime(timezone.now())
    mois_param = request.query_params.get('mois')
    if mois_param:
        try:
            annee, mois = map(int, mois_param.split('-'))
        except (ValueError, AttributeError):
            return Response({'error': "Paramètre 'mois' invalide, format attendu AAAA-MM."}, status=400)
    else:
        annee, mois = now_local.year, now_local.month

    debut, fin = _bornes_mois(now_local, annee, mois)

    mouvements = MouvementStock.objects.filter(
        date_mouvement__gte=debut, date_mouvement__lt=fin
    ).order_by('medicament_id', 'date_mouvement').values('medicament_id', 'quantite_avant', 'quantite_apres')

    mouvements_par_med = {}
    for m in mouvements:
        mouvements_par_med.setdefault(m['medicament_id'], []).append(m)

    medicaments_data = []
    sous_controle_data = []
    for med in Medicament.objects.filter(est_actif=True).order_by('nom'):
        mvts = mouvements_par_med.get(med.id, [])
        # Le delta réel (quantite_apres - quantite_avant) est utilisé plutôt que le champ
        # quantite brut, car les mouvements d'ajustement stockent une quantité cible
        # absolue et non un delta relatif.
        entrees = sum(m['quantite_apres'] - m['quantite_avant'] for m in mvts if m['quantite_apres'] > m['quantite_avant'])
        sorties = sum(m['quantite_avant'] - m['quantite_apres'] for m in mvts if m['quantite_apres'] < m['quantite_avant'])
        if mvts:
            stock_debut = mvts[0]['quantite_avant']
            stock_fin = mvts[-1]['quantite_apres']
        else:
            stock_debut = stock_fin = med.quantite_stock

        entry = {
            'nom': med.nom,
            'DCI': med.denomination_commune,
            'forme': med.get_forme_display(),
            'dosage': med.dosage,
            'stock_debut': stock_debut,
            'entrees': entrees,
            'sorties': sorties,
            'stock_fin': stock_fin,
            'sous_controle': med.sous_controle_dpml,
        }
        medicaments_data.append(entry)
        if med.sous_controle_dpml:
            sous_controle_data.append(entry)

    return Response({
        'periode': f"{MOIS_FR[mois - 1]} {annee}",
        'genere_le': now_local.strftime('%d/%m/%Y %H:%M'),
        # Identité de la pharmacie (nom/NIU/adresse) : gérée côté frontend via les
        # variables VITE_PHARMACIE_* (même choix que pour le reçu de vente), le backend
        # n'a pas cette information.
        'pharmacie': {},
        'medicaments': medicaments_data,
        'sous_controle_uniquement': sous_controle_data,
    })
