import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const
/** Urdu week — Sunday first (Pakistan) */
const WEEKDAYS_UR = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'] as const

const MONTHS_UR = [
  'جنوری',
  'فروری',
  'مارچ',
  'اپریل',
  'مئی',
  'جون',
  'جولائی',
  'اگست',
  'ستمبر',
  'اکتوبر',
  'نومبر',
  'دسمبر',
] as const

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Parse DD/MM/YYYY or DD-MM-YYYY → Date | null */
export function parseDisplayDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d
}

export function formatDisplayDate(d: Date) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function formatDashDate(d: Date) {
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

interface MandiDatePickerProps {
  value: string
  onChange: (displayDate: string) => void
  className?: string
  /** Urdu = RTL calendar (right-side start) */
  lang?: 'en' | 'ur'
  /**
   * Popover edge against the field.
   * `left` = open toward page left (away from right sidebar) — use on Cash/Roznamcha toolbars.
   */
  popoverAlign?: 'auto' | 'left' | 'right'
}

/** Datepicker — Urdu/RTL starts from the right. */
export function MandiDatePicker({
  value,
  onChange,
  className,
  lang = 'ur',
  popoverAlign = 'auto',
}: MandiDatePickerProps) {
  const isUrdu = lang === 'ur'
  const rootRef = useRef<HTMLDivElement>(null)
  const parsed = parseDisplayDate(value) || new Date()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => new Date(parsed.getFullYear(), parsed.getMonth(), 1))
  /** Physical: open toward page left (right-0) vs right (left-0) */
  const [openToward, setOpenToward] = useState<'left' | 'right'>(isUrdu ? 'left' : 'right')

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      const d = parseDisplayDate(value) || new Date()
      setView(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [open, value])

  // Keep calendar on-screen (responsive) — flip when near left/right edges
  useEffect(() => {
    if (!open || !rootRef.current) return

    if (popoverAlign === 'left') {
      setOpenToward('left')
      return
    }
    if (popoverAlign === 'right') {
      setOpenToward('right')
      return
    }

    const rect = rootRef.current.getBoundingClientRect()
    const popW = Math.min(300, window.innerWidth - 24)
    const spaceRight = window.innerWidth - rect.left
    const spaceLeft = rect.right

    if (spaceLeft < popW + 8 && spaceRight >= popW + 8) {
      setOpenToward('right')
    } else if (spaceRight < popW + 8 && spaceLeft >= popW + 8) {
      setOpenToward('left')
    } else {
      setOpenToward(isUrdu ? 'left' : 'right')
    }
  }, [open, popoverAlign, isUrdu])

  const days = useMemo(() => {
    const year = view.getFullYear()
    const month = view.getMonth()
    const firstDow = new Date(year, month, 1).getDay() // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ day: number; inMonth: boolean; date: Date }> = []

    const prevDays = new Date(year, month, 0).getDate()
    for (let i = firstDow - 1; i >= 0; i--) {
      const day = prevDays - i
      cells.push({ day, inMonth: false, date: new Date(year, month - 1, day) })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, inMonth: true, date: new Date(year, month, day) })
    }
    let next = 1
    while (cells.length % 7 !== 0) {
      cells.push({ day: next, inMonth: false, date: new Date(year, month + 1, next) })
      next += 1
    }
    return cells
  }, [view])

  const monthLabel = isUrdu
    ? `${MONTHS_UR[view.getMonth()]} ${view.getFullYear()}`
    : view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const weekdays = isUrdu ? WEEKDAYS_UR : WEEKDAYS_EN
  const selected = parseDisplayDate(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pick = (d: Date) => {
    onChange(formatDisplayDate(d))
    setOpen(false)
  }

  const prevMonth = () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
  const nextMonth = () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))

  return (
    <div
      ref={rootRef}
      className={cn('relative w-[11rem] min-w-[11rem] shrink-0', className)}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'mandi-input inline-flex h-10 w-full items-center justify-between gap-2 px-3 text-center text-sm font-semibold text-slate-800',
          'hover:border-sky-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200',
          isUrdu && 'font-urdu'
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {/* Numbers stay LTR — full DD/MM/YYYY visible */}
        <span className="min-w-0 flex-1 whitespace-nowrap tabular-nums tracking-wide" dir="ltr">
          {value || formatDisplayDate(new Date())}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-sky-700" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-[calc(100%+6px)] z-[60] w-[min(18.75rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5',
            openToward === 'left' ? 'right-0' : 'left-0'
          )}
          role="dialog"
          dir={isUrdu ? 'rtl' : 'ltr'}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            {/* In RTL, visual "previous" (towards older) should be on the right */}
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              onClick={isUrdu ? nextMonth : prevMonth}
              aria-label={isUrdu ? 'اگلا مہینہ' : 'Previous month'}
            >
              {isUrdu ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            <p className={cn('text-sm font-bold text-slate-800', isUrdu && 'font-urdu')}>{monthLabel}</p>

            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              onClick={isUrdu ? prevMonth : nextMonth}
              aria-label={isUrdu ? 'پچھلا مہینہ' : 'Next month'}
            >
              {isUrdu ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          {/* dir=rtl makes first weekday (Sunday) appear on the RIGHT */}
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {weekdays.map((w) => (
              <div
                key={w}
                className={cn(
                  'py-1 text-center text-[10px] font-bold text-slate-400',
                  isUrdu ? 'font-urdu text-[11px]' : 'uppercase'
                )}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((cell, i) => {
              const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}-${i}`
              const isSelected =
                !!selected &&
                cell.date.getFullYear() === selected.getFullYear() &&
                cell.date.getMonth() === selected.getMonth() &&
                cell.date.getDate() === selected.getDate()
              const isToday = cell.date.getTime() === today.getTime()

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(cell.date)}
                  dir="ltr"
                  className={cn(
                    'h-8 rounded-lg text-xs font-semibold tabular-nums transition',
                    cell.inMonth ? 'text-slate-800 hover:bg-sky-50' : 'text-slate-300',
                    isSelected && 'bg-[#0d5f86] text-white hover:bg-[#0d5f86]',
                    !isSelected && isToday && 'ring-1 ring-sky-400'
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              className={cn(
                'rounded-md px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50',
                isUrdu && 'font-urdu'
              )}
              onClick={() => pick(new Date())}
            >
              {isUrdu ? 'آج' : 'Today'}
            </button>
            <button
              type="button"
              className={cn(
                'rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50',
                isUrdu && 'font-urdu'
              )}
              onClick={() => setOpen(false)}
            >
              {isUrdu ? 'بند' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
