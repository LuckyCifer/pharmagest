from django.db import migrations

# Motifs de contrôle DPML (circulaires déc. 2019) recherchés dans le nom ou la DCI,
# insensible à la casse — mots-clés exacts demandés par le mandat.
MOTIFS = {
    'tramadol': 'Tramadol',
    'tramad': 'Tramadol',
    'dermocort': 'Dermocorticoïde',
    'bétaméthasone': 'Dermocorticoïde',
    'dexaméthasone': 'Dermocorticoïde',
}


def marquer_sous_controle(apps, schema_editor):
    Medicament = apps.get_model('medicaments', 'Medicament')
    for med in Medicament.objects.all():
        haystack = f"{med.nom} {med.denomination_commune}".lower()
        for mot_cle, motif in MOTIFS.items():
            if mot_cle in haystack:
                med.sous_controle_dpml = True
                med.motif_controle = motif
                med.save(update_fields=['sous_controle_dpml', 'motif_controle'])
                break


def demarquer_sous_controle(apps, schema_editor):
    Medicament = apps.get_model('medicaments', 'Medicament')
    Medicament.objects.filter(sous_controle_dpml=True, motif_controle__in=set(MOTIFS.values())).update(
        sous_controle_dpml=False, motif_controle=''
    )


class Migration(migrations.Migration):

    dependencies = [
        ('medicaments', '0003_medicament_motif_controle_and_more'),
    ]

    operations = [
        migrations.RunPython(marquer_sous_controle, demarquer_sous_controle),
    ]
