import { AlertTriangle } from 'lucide-react'
import { useLang } from '../context/LangContext'

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel, danger = true }) {
  const { t } = useLang()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 p-2 rounded-full ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            <AlertTriangle size={18} className={danger ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
            {message && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1">{t('common.cancel')}</button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
