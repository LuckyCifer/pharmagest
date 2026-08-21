import { X, Printer } from 'lucide-react'
import { formatFCFA, formatDateTime } from '../utils/formatters'
import { useLang } from '../context/LangContext'

export default function PayslipModal({ fiche, onClose }) {
  const { t, lang } = useLang()

  if (!fiche) return null

  const handlePrint = () => window.print()

  const paymentLabels = { especes: t('paie.cash'), mobile_money: t('paie.mobile'), virement: t('paie.transfer') }
  const statusLabels = { en_attente: t('paie.pending'), payee: t('paie.paid') }
  const months = t('paie.months')
  const periode = `${months[fiche.mois - 1]} ${fiche.annee}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 print:bg-transparent">
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-[60]">
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer size={15} />
          {t('common.print')}
        </button>
        <button onClick={onClose} className="btn-secondary flex items-center gap-2">
          <X size={15} />
          {t('common.close')}
        </button>
      </div>

      <div
        id="payslip-content"
        className="bg-white text-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] overflow-y-auto print:max-h-none print:overflow-visible print:rounded-none print:shadow-none print:max-w-none"
      >
        <div className="text-center px-6 pt-6 pb-4 border-b border-dashed border-gray-300">
          <div className="text-lg font-bold tracking-wide uppercase">PharmaGest</div>
          <div className="text-xs text-gray-500 mt-0.5">ACERFI Formation · Douala, Cameroun</div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-widest text-gray-600">{t('payslip.subtitle')}</div>
        </div>

        <div className="px-6 py-3 border-b border-dashed border-gray-300 space-y-1">
          <Row label={t('payslip.employee')} value={fiche.employe_nom} />
          <Row label={t('payslip.role')} value={fiche.employe_role ? t(`users.roles.${fiche.employe_role}`) : '—'} />
          <Row label={t('payslip.period')} value={periode} />
        </div>

        <div className="px-6 py-3 border-b border-dashed border-gray-300 space-y-1.5">
          <Row label={t('payslip.baseSalary')} value={formatFCFA(fiche.salaire_base, lang)} />
          <Row label={t('payslip.bonuses')} value={formatFCFA(fiche.primes, lang)} />
          <Row label={t('payslip.deductions')} value={`- ${formatFCFA(fiche.deductions, lang)}`} />
          <Row label={t('payslip.netAmount')} value={formatFCFA(fiche.montant_net, lang)} bold />
        </div>

        <div className="px-6 py-3 border-b border-dashed border-gray-300 space-y-1.5">
          <Row label={t('payslip.paymentMode')} value={paymentLabels[fiche.mode_paiement] || fiche.mode_paiement} />
          <Row label={t('payslip.status')} value={statusLabels[fiche.statut] || fiche.statut} />
          {fiche.date_paiement && <Row label={t('payslip.paymentDate')} value={formatDateTime(fiche.date_paiement, lang)} />}
          <Row label={t('payslip.preparedBy')} value={fiche.cree_par_nom || '—'} />
        </div>

        <div className="text-center px-6 py-4 text-xs text-gray-500 space-y-0.5">
          <p>{t('payslip.footerNote')}</p>
          <p className="text-gray-400 mt-2">— PharmaGest —</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-xs gap-2 ${bold ? 'font-bold text-sm text-gray-900' : 'text-gray-700'}`}>
      <span className={bold ? '' : 'text-gray-500'}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
