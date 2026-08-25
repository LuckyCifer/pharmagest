import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { formatFCFA, formatDateTime } from '../utils/formatters'
import { useLang } from '../context/LangContext'

export default function ReceiptModal({ vente, onClose }) {
  const receiptRef = useRef(null)
  const { t, lang } = useLang()

  if (!vente) return null

  const handlePrint = () => window.print()

  const paymentLabels = { especes: t('sales.cash'), mobile_money: t('sales.mobile'), carte: t('sales.card'), credit: t('sales.credit') }
  const niu = import.meta.env.VITE_PHARMACIE_NIU
  const rccm = import.meta.env.VITE_PHARMACIE_RCCM
  const pharmacieNom = import.meta.env.VITE_PHARMACIE_NOM || 'PharmaGest'
  const pharmacieAdresse = import.meta.env.VITE_PHARMACIE_ADRESSE || 'ACERFI Formation · Douala, Cameroun'
  const pharmacieTel = import.meta.env.VITE_PHARMACIE_TEL || '+237 6XX XXX XXX'
  const tauxTva = vente.lignes?.find(l => Number(l.taux_tva) > 0)?.taux_tva

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 print:bg-transparent">
      {/* Non-printable overlay buttons */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-[60]">
        <button
          onClick={handlePrint}
          className="btn-primary flex items-center gap-2"
        >
          <Printer size={15} />
          {t('common.print')}
        </button>
        <button
          onClick={onClose}
          className="btn-secondary flex items-center gap-2"
        >
          <X size={15} />
          {t('common.close')}
        </button>
      </div>

      {/* Receipt */}
      <div
        id="receipt-content"
        ref={receiptRef}
        className="bg-white text-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:rounded-none print:shadow-none print:max-w-none"
      >
        {/* Header */}
        <div className="text-center px-6 pt-6 pb-4 border-b border-dashed border-gray-300">
          {vente.__offline && (
            <div className="mb-2 inline-block text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 rounded-full px-3 py-1">
              {t('receipt.offlineProvisional')}
            </div>
          )}
          <div className="text-lg font-bold tracking-wide uppercase">{pharmacieNom}</div>
          <div className="text-xs text-gray-500 mt-0.5">{pharmacieAdresse}</div>
          <div className="text-xs text-gray-400 mt-0.5">Tél: {pharmacieTel}</div>
          {niu && <div className="text-xs text-gray-400 mt-0.5">{t('receipt.niu')}: {niu}</div>}
          {rccm && <div className="text-xs text-gray-400 mt-0.5">{t('receipt.rccm')}: {rccm}</div>}
          <div className="mt-3 text-xs font-semibold uppercase tracking-widest text-gray-600">{t('receipt.subtitle')}</div>
        </div>

        {/* Sale info */}
        <div className="px-6 py-3 border-b border-dashed border-gray-300 space-y-1">
          <Row label={t('receipt.reference')} value={vente.reference} mono />
          <Row label={t('receipt.date')} value={formatDateTime(vente.date_vente, lang)} />
          <Row label={t('receipt.cashier')} value={vente.vendeur_nom || '—'} />
          {vente.client_nom && <Row label={t('receipt.client')} value={vente.client_nom} />}
          {vente.client_telephone && <Row label={t('receipt.phone')} value={vente.client_telephone} />}
        </div>

        {/* Lines */}
        <div className="px-6 py-3 border-b border-dashed border-gray-300">
          <div className="flex text-xs font-semibold text-gray-500 uppercase mb-2">
            <span className="flex-1">{t('receipt.item')}</span>
            <span className="w-8 text-center">{t('receipt.qty')}</span>
            <span className="w-24 text-right">{t('receipt.amount')}</span>
          </div>
          {vente.lignes?.map((l, i) => (
            <div key={i} className="flex text-xs py-1 border-t border-gray-100">
              <span className="flex-1 text-gray-800 break-words pr-2">{l.medicament_nom}</span>
              <span className="w-8 text-center text-gray-600">{l.quantite}</span>
              <span className="w-24 text-right font-medium">{formatFCFA(l.sous_total, lang)}</span>
            </div>
          ))}
        </div>

        {/* Ordonnance médicale */}
        {vente.numero_ordonnance && (
          <div className="px-6 py-3 border-b border-dashed border-gray-300 space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('receipt.prescriptionTitle')}</div>
            <Row label={t('receipt.prescriptionNumber')} value={vente.numero_ordonnance} mono />
            {vente.prescripteur_nom && <Row label={t('receipt.prescriber')} value={vente.prescripteur_nom} />}
          </div>
        )}

        {/* Totals */}
        <div className="px-6 py-3 border-b border-dashed border-gray-300 space-y-1.5">
          <Row label={t('receipt.montantHT')} value={formatFCFA(vente.montant_ht, lang)} />
          {Number(vente.montant_tva) > 0 && (
            <Row label={t('receipt.tva', { taux: tauxTva })} value={formatFCFA(vente.montant_tva, lang)} />
          )}
          <Row label={t('receipt.total')} value={formatFCFA(vente.montant_total, lang)} bold />
          <Row label={t('receipt.paymentMode')} value={paymentLabels[vente.mode_paiement] || vente.mode_paiement} />
          <Row label={t('receipt.amountPaid')} value={formatFCFA(vente.montant_paye, lang)} />
          {vente.monnaie_rendue > 0 && (
            <Row label={t('receipt.changeGiven')} value={formatFCFA(vente.monnaie_rendue, lang)} highlight />
          )}
        </div>

        {vente.__offline && (
          <div className="px-6 py-3 border-b border-dashed border-gray-300 text-xs text-amber-700 bg-amber-50">
            {t('receipt.offlineNote')}
          </div>
        )}

        {/* Footer */}
        <div className="text-center px-6 py-4 text-xs text-gray-500 space-y-0.5">
          <p className="font-medium text-gray-700">{t('receipt.thanks')}</p>
          <p>{t('receipt.keepReceipt')}</p>
          <p className="text-gray-400 mt-2">— {pharmacieNom} —</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono, bold, highlight }) {
  return (
    <div className={`flex justify-between text-xs gap-2 ${highlight ? 'text-green-700 font-semibold' : bold ? 'font-bold text-sm text-gray-900' : 'text-gray-700'}`}>
      <span className={bold ? '' : 'text-gray-500'}>{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  )
}
