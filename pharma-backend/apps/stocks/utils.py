from django.utils import timezone


def verifier_alertes(medicament):
    """Crée ou résout automatiquement les alertes pour un médicament donné."""
    from .models import Alerte

    aujourd_hui = timezone.now().date()
    types_actifs = set()

    # --- Stock ---
    if medicament.quantite_stock == 0:
        types_actifs.add('rupture')
    elif medicament.quantite_stock <= medicament.seuil_alerte:
        types_actifs.add('stock_critique')

    # --- Péremption ---
    if medicament.date_peremption:
        delta = (medicament.date_peremption - aujourd_hui).days
        if delta < 0:
            types_actifs.add('perime')
        elif delta <= 7:
            types_actifs.add('peremption_urgente')
        elif delta <= 30:
            types_actifs.add('peremption_proche')

    # Auto-résoudre les alertes qui ne s'appliquent plus
    tous_types = {'rupture', 'stock_critique', 'perime', 'peremption_urgente', 'peremption_proche'}
    types_a_resoudre = tous_types - types_actifs
    Alerte.objects.filter(
        medicament=medicament,
        type_alerte__in=types_a_resoudre,
        est_resolue=False
    ).update(est_resolue=True, date_resolution=timezone.now())

    # Créer les alertes manquantes — messages calculés à la demande (pas en dict
    # eager) car date_peremption peut être None pour un type d'alerte non déclenché.
    def message_pour(type_alerte):
        date_str = medicament.date_peremption.strftime('%d/%m/%Y') if medicament.date_peremption else ''
        return {
            'rupture':            f"Rupture de stock : {medicament.nom} (0 unité disponible)",
            'stock_critique':     f"Stock critique : {medicament.nom} — {medicament.quantite_stock} unité(s) restante(s) (seuil : {medicament.seuil_alerte})",
            'perime':             f"{medicament.nom} est périmé depuis le {date_str}",
            'peremption_urgente': f"{medicament.nom} expire dans moins de 7 jours ({date_str})",
            'peremption_proche':  f"{medicament.nom} expire dans moins de 30 jours ({date_str})",
        }[type_alerte]

    for type_alerte in types_actifs:
        existe = Alerte.objects.filter(
            medicament=medicament,
            type_alerte=type_alerte,
            est_resolue=False
        ).exists()
        if not existe:
            Alerte.objects.create(
                medicament=medicament,
                type_alerte=type_alerte,
                message=message_pour(type_alerte)
            )
