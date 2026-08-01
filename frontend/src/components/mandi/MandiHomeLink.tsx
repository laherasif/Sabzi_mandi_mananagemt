import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MandiHomeLinkProps {
  lang: 'en' | 'ur'
  className?: string
}

/** Header Home chip — icon + ہوم (same on every page) */
export function MandiHomeLink({ lang, className }: MandiHomeLinkProps) {
  const rtl = lang === 'ur'

  return (
    <Link
      to="/home"
      dir={rtl ? 'rtl' : 'ltr'}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/20',
        'hover:bg-white/25',
        className
      )}
    >
      <Home className="h-4 w-4 shrink-0" />
      <span className={rtl ? 'font-urdu' : ''}>{rtl ? 'ہوم' : 'Home'}</span>
    </Link>
  )
}
