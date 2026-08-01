import { useSearchParams } from 'react-router-dom'
import { PurchaseBillPage } from '@/pages/PurchaseBillPage'
import { CustomerPurchasePage } from '@/pages/CustomerPurchasePage'

/** /purchases → خرید بل · /purchases?type=customer → کسٹمر خرید */
export function PurchasesGate() {
  const [params] = useSearchParams()
  if (params.get('type') === 'customer') return <CustomerPurchasePage />
  return <PurchaseBillPage />
}
