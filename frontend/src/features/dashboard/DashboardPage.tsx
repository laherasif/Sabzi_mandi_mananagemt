import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSelector } from '@/hooks/redux'
import { useListPartiesQuery } from '@/store/api/partiesApi'
import { useListProductsQuery } from '@/store/api/productsApi'
import { formatPkr } from '@/lib/money'
import { LoadingState } from '@/components/shared/LoadingState'

export function DashboardPage() {
  const { t } = useTranslation()
  const user = useAppSelector((s) => s.auth.user)
  const { data: parties, isLoading: loadingParties } = useListPartiesQuery({ limit: 100 })
  const { data: products, isLoading: loadingProducts } = useListProductsQuery({ limit: 100 })

  const partyList = parties?.data ?? []
  const productList = products?.data ?? []

  const customerOutstanding = partyList
    .filter((p) => p.type === 'customer' && p.balancePaisa > 0)
    .reduce((s, p) => s + p.balancePaisa, 0)

  const supplierOutstanding = partyList
    .filter((p) => p.type === 'supplier' && p.balancePaisa < 0)
    .reduce((s, p) => s + Math.abs(p.balancePaisa), 0)

  const lowStock = productList.filter((p) => p.stockInBaseUnit <= p.minStockAlert).length

  if (loadingParties || loadingProducts) return <LoadingState label={t('common.loading')} />

  const tiles = [
    { label: t('parties.types.customer'), value: String(partyList.filter((p) => p.type === 'customer').length), tone: 'brand' },
    { label: t('parties.types.supplier'), value: String(partyList.filter((p) => p.type === 'supplier').length), tone: 'accent' },
    { label: t('products.title'), value: String(productList.length), tone: 'brand' },
    { label: t('dashboard.customerOutstanding'), value: formatPkr(customerOutstanding), tone: 'brand' },
    { label: t('dashboard.supplierOutstanding'), value: formatPkr(supplierOutstanding), tone: 'accent' },
    { label: t('dashboard.stockAlerts'), value: String(lowStock), tone: lowStock ? 'accent' : 'brand' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl">{t('dashboard.title')}</h1>
        <p className="text-muted">
          {t('dashboard.subtitle')} — {user?.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="overflow-hidden">
            <div
              className={`h-1.5 ${tile.tone === 'accent' ? 'bg-accent' : 'bg-brand'}`}
            />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight lg:text-3xl">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-8 text-center text-muted">
          {t('dashboard.placeholder')}
        </CardContent>
      </Card>
    </div>
  )
}
