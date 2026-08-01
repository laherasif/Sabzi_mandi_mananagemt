import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Expand, Minimize2, Printer, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Compact toolbar button — opens full-page sheet view */
export function MandiExpandButton({
  lang,
  onClick,
  className,
}: {
  lang: 'en' | 'ur'
  onClick: () => void
  className?: string
}) {
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#0d5f86] bg-sky-50 px-4 text-xs font-bold leading-none text-[#0d5f86] shadow-sm hover:bg-sky-100',
        lang === 'ur' && 'font-urdu',
        className
      )}
    >
      <Expand className="h-3.5 w-3.5" />
      {L('بڑا کریں', 'Expand')}
    </button>
  )
}

/** Full-viewport modal for easy sheet reading */
export function MandiExpandModal({
  open,
  onClose,
  lang,
  titleUr,
  titleEn,
  subtitle,
  children,
  showPrint = true,
}: {
  open: boolean
  onClose: () => void
  lang: 'en' | 'ur'
  titleUr: string
  titleEn: string
  subtitle?: string
  children: ReactNode
  showPrint?: boolean
}) {
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-slate-900/50 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={L(titleUr, titleEn)}
    >
      <div className="flex h-full min-h-0 w-full flex-col bg-[#d7eaf4]">
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-[#0d5f86]/30 bg-[#0d5f86] px-4 py-3 text-white shadow"
          dir={lang === 'ur' ? 'rtl' : 'ltr'}
        >
          <div className="min-w-0">
            <h2 className={cn('text-lg font-bold leading-tight', lang === 'ur' && 'font-urdu')}>
              {L(titleUr, titleEn)}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-sky-100" dir="ltr">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showPrint ? (
              <button
                type="button"
                onClick={() => window.print()}
                className={cn(
                  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700',
                  lang === 'ur' && 'font-urdu'
                )}
              >
                <Printer className="h-3.5 w-3.5" />
                {L('پرنٹ', 'Print')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-bold text-white hover:bg-white/25',
                lang === 'ur' && 'font-urdu'
              )}
            >
              <Minimize2 className="h-3.5 w-3.5" />
              {L('چھوٹا کریں', 'Collapse')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
              aria-label={L('بند کریں', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}
