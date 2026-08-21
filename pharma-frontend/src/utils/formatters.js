export const formatFCFA = (montant, lang = 'fr') => {
  if (montant == null) return '—'
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-CM', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant)
}

export const formatDate = (dateStr, lang = 'fr') => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const formatDateTime = (dateStr, lang = 'fr') => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const statutStockBadge = (statut, t) => {
  const map = {
    normal:   { label: t('medications.normal'),  class: 'badge-success' },
    critique: { label: t('medications.critique'), class: 'badge-warning' },
    rupture:  { label: t('medications.rupture'),  class: 'badge-danger'  },
  }
  return map[statut] || { label: statut, class: 'badge-gray' }
}

export const statutPaieBadge = (statut, t) => {
  const map = {
    en_attente: { label: t('paie.pending'), class: 'badge-warning' },
    payee:      { label: t('paie.paid'),    class: 'badge-success' },
  }
  return map[statut] || { label: statut, class: 'badge-gray' }
}

export const statutPeremptionBadge = (statut, t) => {
  const map = {
    valide:  { label: t('medications.expiryValid'),   class: 'badge-success' },
    bientot: { label: t('medications.expirySoon30'),   class: 'badge-warning' },
    urgent:  { label: t('medications.expirySoon7'),    class: 'badge-danger'  },
    perime:  { label: t('medications.expiryExpired'),  class: 'badge-danger'  },
    inconnu: { label: t('medications.expiryUnknown'),  class: 'badge-gray'  },
  }
  return map[statut] || { label: statut, class: 'badge-gray' }
}
