import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { applyDocumentDirection, resolveLang } from '@/i18n'

/** Keeps html/body dir in sync and remounts layout when language/direction changes. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const lang = resolveLang(i18n.language)
  const dir = lang === 'ur' ? 'rtl' : 'ltr'
  const [, setTick] = useState(0)

  useEffect(() => {
    applyDocumentDirection(lang)
    const onChanged = () => {
      applyDocumentDirection(i18n.language)
      setTick((n) => n + 1)
    }
    i18n.on('languageChanged', onChanged)
    return () => {
      i18n.off('languageChanged', onChanged)
    }
  }, [i18n, lang])

  return (
    <div lang={lang} dir={dir} className={lang === 'ur' ? 'font-urdu min-h-screen' : 'min-h-screen'}>
      {children}
    </div>
  )
}
