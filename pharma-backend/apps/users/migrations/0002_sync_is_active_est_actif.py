from django.db import migrations


def synchroniser(apps, schema_editor):
    Utilisateur = apps.get_model('users', 'Utilisateur')
    Utilisateur.objects.filter(est_actif=False).update(is_active=False)
    Utilisateur.objects.filter(est_actif=True).update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(synchroniser, migrations.RunPython.noop),
    ]
