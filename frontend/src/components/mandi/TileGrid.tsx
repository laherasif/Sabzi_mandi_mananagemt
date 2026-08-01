import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface MandiTile {
  labelUr: string
  labelEn: string
  to: string
  icon: LucideIcon
  badge?: number | string
  size?: 'lg' | 'sm'
  tone?: 'sky' | 'emerald' | 'orange' | 'violet' | 'slate'
}

const toneMap = {
  sky: 'from-sky-50 to-white text-sky-700 ring-sky-100',
  emerald: 'from-emerald-50 to-white text-emerald-700 ring-emerald-100',
  orange: 'from-orange-50 to-white text-orange-700 ring-orange-100',
  violet: 'from-violet-50 to-white text-violet-700 ring-violet-100',
  slate: 'from-slate-50 to-white text-slate-700 ring-slate-100',
}

interface TileGridProps {
  tiles: MandiTile[]
  lang: 'en' | 'ur'
  columns?: string
}

export function TileGrid({ tiles, lang, columns }: TileGridProps) {
  return (
    <div
      className={cn(
        'grid gap-2.5',
        columns || 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7'
      )}
    >
      {tiles.map((tile) => {
        const Icon = tile.icon
        const large = tile.size !== 'sm'
        const tone = toneMap[tile.tone || 'sky']
        return (
          <Link
            key={tile.to + tile.labelUr}
            to={tile.to}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b ring-1 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg',
              tone,
              large ? 'min-h-[96px] gap-1.5 px-2 py-3' : 'min-h-[80px] gap-1 px-1.5 py-2'
            )}
          >
            {tile.badge != null && (
              <span className="absolute -top-2 end-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white shadow-md ring-2 ring-white">
                {tile.badge}
              </span>
            )}
            <span
              className={cn(
                'flex items-center justify-center rounded-xl bg-white/80 shadow-sm',
                large ? 'h-11 w-11' : 'h-9 w-9'
              )}
            >
              <Icon className={cn(large ? 'h-6 w-6' : 'h-5 w-5')} strokeWidth={1.75} />
            </span>
            <span
              className={cn(
                'text-center leading-tight font-semibold',
                large ? 'text-[13px]' : 'text-[12px]',
                lang === 'ur' && 'font-urdu'
              )}
            >
              {lang === 'ur' ? tile.labelUr : tile.labelEn}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
