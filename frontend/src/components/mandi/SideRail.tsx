import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface SideAction {
  labelUr: string
  labelEn: string
  to: string
  icon: LucideIcon
  /** Prefer orange when this item is the active URL (بنام / جمع / وصولی) */
  accent?: 'orange' | 'default'
}

interface SideRailProps {
  titleUr: string
  titleEn: string
  items: SideAction[]
  lang: 'en' | 'ur'
  side: 'start' | 'end'
  className?: string
  /** Home page uses a roomier rail; other pages stay compact */
  size?: 'compact' | 'comfortable'
}

/** Exact URL match including query (e.g. /payments?type=credit). */
function linkIsActive(to: string, pathname: string, search: string) {
  const target = new URL(to, 'http://app.local')
  if (target.pathname !== pathname) return false

  const wanted = new URLSearchParams(target.search)
  const current = new URLSearchParams(search)
  const wantedKeys = [...wanted.keys()]

  // Path-only menu item (e.g. /cashbook, /parties)
  if (wantedKeys.length === 0) {
    // Don't mark /parties active when URL is /parties?new=customer (other menu owns that)
    if (pathname === '/parties' && (current.get('new') || current.get('type'))) return false
    if (pathname === '/products' && current.get('new')) return false
    if (pathname === '/purchases' && current.get('type')) return false
    if (pathname === '/sales') return !current.toString()
    return true
  }

  for (const [key, value] of wanted.entries()) {
    if (key === 'type') {
      // /payments with no type defaults to debit
      const effective =
        pathname === '/payments' ? current.get('type') || 'debit' : current.get('type') || ''
      if (effective !== value) return false
    } else if ((current.get(key) || '') !== value) {
      return false
    }
  }
  return true
}

/** Classic Mandi side menu — active state follows current URL. */
export function SideRail({
  titleUr,
  titleEn,
  items,
  lang,
  side,
  className,
  size = 'compact',
}: SideRailProps) {
  const location = useLocation()
  const roomy = size === 'comfortable'

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-[#0c4a6e] transition-[width] duration-200',
        roomy ? 'w-[148px] sm:w-[168px]' : 'w-[118px] sm:w-[128px]',
        side === 'start' ? 'border-e border-[#083344]' : 'border-s border-[#083344]',
        className
      )}
    >
      <div className={cn('shrink-0 border-b border-white/15 bg-[#083344]', roomy ? 'px-2.5 py-2.5' : 'px-2 py-2')}>
        <p
          className={cn(
            'text-center font-bold tracking-wide text-sky-100',
            roomy
              ? lang === 'ur'
                ? 'font-urdu text-[15px] tracking-normal'
                : 'text-xs'
              : lang === 'ur'
                ? 'font-urdu text-[13px] tracking-normal'
                : 'text-[11px]'
          )}
        >
          {lang === 'ur' ? titleUr : titleEn}
        </p>
      </div>

      <nav
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden',
          roomy ? 'gap-2 p-2.5' : 'gap-1.5 p-2'
        )}
      >
        {items.map((item) => {
          const Icon = item.icon
          const active = linkIsActive(item.to, location.pathname, location.search)
          const showOrange = item.accent === 'orange' && active

          return (
            <NavLink
              key={item.to + item.labelUr}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md transition',
                'shadow-sm ring-1 ring-black/10',
                roomy ? 'min-h-[48px] px-2.5 py-2.5' : 'min-h-[42px] px-2 py-2',
                showOrange
                  ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white ring-2 ring-white/70'
                  : active
                    ? 'bg-gradient-to-b from-[#f97316] to-[#ea580c] text-white ring-2 ring-orange-200'
                    : 'bg-gradient-to-b from-[#1a6f96] to-[#145a7a] text-white hover:from-[#2180ab] hover:to-[#1a6f96]'
              )}
            >
              <span
                className={cn(
                  'min-w-0 flex-1 font-bold leading-tight',
                  roomy
                    ? lang === 'ur'
                      ? 'font-urdu text-[14px] text-start'
                      : 'text-[13px] text-start'
                    : lang === 'ur'
                      ? 'font-urdu text-[13px] text-start'
                      : 'text-[12px] text-start'
                )}
              >
                {lang === 'ur' ? item.labelUr : item.labelEn}
              </span>
              <Icon
                className={cn('shrink-0 opacity-90', roomy ? 'h-[18px] w-[18px]' : 'h-4 w-4')}
                strokeWidth={2.25}
              />
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
