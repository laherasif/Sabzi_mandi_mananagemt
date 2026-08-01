import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'

interface MandiPageHeaderProps {
  lang: 'en' | 'ur'
  titleUr: string
  titleEn: string
  subtitle?: string
  icon: LucideIcon
  /** Optional white toolbar under the blue title bar */
  toolbar?: ReactNode
}

/** Blue report header — same style as Sheet (سیل مال رپورٹ) */
export function MandiPageHeader({
  lang,
  titleUr,
  titleEn,
  subtitle,
  icon: Icon,
  toolbar,
}: MandiPageHeaderProps) {
  const rtl = lang === 'ur'
  const L = (ur: string, en: string) => (rtl ? ur : en)

  return (
    <div className="shrink-0 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] via-[#1a7eab] to-[#0d5f86] text-white shadow print:hidden">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Icon className="h-5 w-5 text-sky-100" />
          </span>
          <div>
            <h1 className={cn('text-lg font-bold leading-tight', rtl && 'font-urdu text-xl')}>
              {L(titleUr, titleEn)}
            </h1>
            {subtitle ? (
              <p className="text-[11px] text-sky-100/90" dir="ltr">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <MandiHomeLink lang={lang} />
      </div>

      {toolbar ? (
        <div
          className="flex flex-wrap items-end gap-2.5 border-t border-white/15 bg-white/95 px-4 py-3 backdrop-blur"
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {toolbar}
        </div>
      ) : null}
    </div>
  )
}
