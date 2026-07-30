import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { resolveLang, setAppLanguage } from '@/i18n'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  className?: string
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?: 'outline' | 'ghost' | 'secondary'
  showLabel?: boolean
}

export function LanguageSwitcher({
  className,
  size = 'sm',
  variant = 'outline',
  showLabel = true,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const lang = resolveLang(i18n.language)

  const toggle = () => {
    void setAppLanguage(lang === 'ur' ? 'en' : 'ur')
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(showLabel && 'min-w-20', className)}
      onClick={toggle}
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" />
      {showLabel ? (lang === 'ur' ? 'EN' : 'اردو') : null}
    </Button>
  )
}
