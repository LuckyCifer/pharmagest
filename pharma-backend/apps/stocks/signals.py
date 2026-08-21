from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='medicaments.Medicament')
def medicament_post_save(sender, instance, **kwargs):
    from .utils import verifier_alertes
    verifier_alertes(instance)
