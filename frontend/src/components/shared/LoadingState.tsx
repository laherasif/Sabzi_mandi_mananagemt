import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingState({ className, label = 'Loading…' }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}
