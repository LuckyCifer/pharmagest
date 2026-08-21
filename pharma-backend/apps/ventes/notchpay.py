import requests
from django.conf import settings


class NotchPayError(Exception):
    pass


def _check_configured():
    if not settings.NOTCHPAY_API_KEY:
        raise NotchPayError("Clé API NotchPay non configurée (NOTCHPAY_API_KEY dans .env).")


def _headers():
    return {'Authorization': settings.NOTCHPAY_API_KEY, 'Content-Type': 'application/json'}


def initialiser_paiement(vente):
    """Crée une intention de paiement NotchPay pour une vente."""
    _check_configured()
    payload = {
        'amount': int(vente.montant_total),
        'currency': 'XAF',
        'reference': vente.reference,
        'description': f'Vente {vente.reference} - PharmaGest',
        'customer': {'phone': vente.client_telephone},
    }
    try:
        r = requests.post(f'{settings.NOTCHPAY_BASE_URL}/payments', json=payload, headers=_headers(), timeout=15)
    except requests.RequestException as e:
        raise NotchPayError(str(e))
    if not r.ok:
        raise NotchPayError(r.text)
    return r.json()['transaction']


def soumettre_paiement_direct(reference_notchpay, operateur, telephone):
    """Déclenche le push USSD sur le téléphone du client (cm.mtn / cm.orange)."""
    _check_configured()
    channel = 'cm.mtn' if operateur == 'mtn' else 'cm.orange'
    try:
        r = requests.post(
            f'{settings.NOTCHPAY_BASE_URL}/payments/{reference_notchpay}/submit',
            json={'channel': channel, 'data': {'phone': telephone}},
            headers=_headers(), timeout=15,
        )
    except requests.RequestException as e:
        raise NotchPayError(str(e))
    if not r.ok:
        raise NotchPayError(r.text)
    return r.json()


def verifier_paiement(reference_notchpay):
    """Consulte le statut d'un paiement NotchPay."""
    _check_configured()
    try:
        r = requests.get(f'{settings.NOTCHPAY_BASE_URL}/payments/{reference_notchpay}', headers=_headers(), timeout=15)
    except requests.RequestException as e:
        raise NotchPayError(str(e))
    if not r.ok:
        raise NotchPayError(r.text)
    return r.json()['transaction']
