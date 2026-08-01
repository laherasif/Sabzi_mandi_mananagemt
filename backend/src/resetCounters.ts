/**
 * Reset invoice/code counters so next number is 1.
 * Run: npx tsx src/resetCounters.ts
 */
import mongoose from 'mongoose'
import { connectDb } from './config/db'
import { Counter, peekSeq } from './models/Counter'

async function main() {
  await connectDb()
  const del = await Counter.deleteMany({})
  const seqDel = await mongoose.connection.db!.collection('sequences').deleteMany({})
  console.log('counters cleared:', del.deletedCount, 'sequences cleared:', seqDel.deletedCount)

  const keys = [
    'sale_invoice',
    'purchase_invoice',
    'customer_purchase_invoice',
    'party',
    'product',
    'marfat',
    'voucher_debit',
    'voucher_credit',
    'voucher_recovery',
    'ledger_entry_no',
  ]
  for (const key of keys) {
    console.log(key, '->', await peekSeq(key, 1))
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
