import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '../context/LangContext'

const PAGE_SIZE = 20

export default function Pagination({ page, setPage, count }) {
  const { t } = useLang()
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  if (totalPages <= 1) return null

  const debut = (page - 1) * PAGE_SIZE + 1
  const fin = Math.min(page * PAGE_SIZE, count)

  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
      <span>
        {debut}–{fin} {t('common.of')} {count} {t('common.results')}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {t('common.page')} {page} {t('common.of')} {totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
