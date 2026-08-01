import { cn } from '@/lib/utils'

/** Shop mark from business name — Muhammad Aslam / Irfan → MAI */
export function ShopLogo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box =
    size === 'lg' ? 'h-14 w-14 text-base' : size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs'

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-br from-red-600 via-red-700 to-red-900 font-black tracking-tight text-white shadow-md ring-2 ring-amber-300/40',
        box,
        className
      )}
      aria-hidden
      title="MAI — Muhammad Aslam / Irfan"
    >
      <span className="relative z-10 drop-shadow-sm" dir="ltr">
        MAI
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_55%)]" />
    </div>
  )
}
