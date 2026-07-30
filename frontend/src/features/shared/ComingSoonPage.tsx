import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'

export function ComingSoonPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold lg:text-3xl">{t(titleKey)}</h1>
      <Card>
        <CardContent className="py-16 text-center text-lg text-muted">
          {t('common.comingSoon')}
        </CardContent>
      </Card>
    </div>
  )
}
