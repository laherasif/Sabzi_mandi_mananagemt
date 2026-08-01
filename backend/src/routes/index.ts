import { Router } from 'express'
import { authRouter } from './auth.routes'
import { partiesRouter } from './parties.routes'
import { productsRouter } from './products.routes'
import { marfatRouter } from './marfat.routes'
import { salesRouter } from './sales.routes'
import { purchasesRouter } from './purchases.routes'
import { customerPurchasesRouter } from './customerPurchases.routes'
import { vouchersRouter } from './vouchers.routes'
import { ledgerRouter } from './ledger.routes'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/parties', partiesRouter)
apiRouter.use('/products', productsRouter)
apiRouter.use('/marfat', marfatRouter)
apiRouter.use('/sales', salesRouter)
apiRouter.use('/purchases', purchasesRouter)
apiRouter.use('/customer-purchases', customerPurchasesRouter)
apiRouter.use('/vouchers', vouchersRouter)
apiRouter.use('/ledger', ledgerRouter)
