import { cn } from '@/lib/utils'

/** Shared Mandi form field — Urdu-safe label (no truncate clipping) */
export function MandiField({
  label,
  children,
  className,
  urdu,
}: {
  label: string
  children: React.ReactNode
  className?: string
  /** Force Nastaliq on label (also auto when html dir=rtl) */
  urdu?: boolean
}) {
  return (
    <label className={cn('block min-w-0 space-y-1', className)}>
      <span className={cn('mandi-label', urdu && 'font-urdu')}>{label}</span>
      {children}
    </label>
  )
}
