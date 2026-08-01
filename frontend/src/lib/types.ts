/** Shared API entity types (mirror backend) */

export type AccountType = 'trader' | 'customer' | 'supplier' | 'expense' | 'cash' | 'other'

export interface Party {
  _id: string
  code: string
  nameUr: string
  nameEn: string
  phone: string
  address: string
  bankAccountNumber: string
  accountType: AccountType
  accountTypeLabel: string
  date: string
  commission: string
  details: string
  item: string
  agrahi: 'NEW' | 'OLD' | ''
  openingDebit: number
  openingCredit: number
  balance: number
  isActive: boolean
}

export interface Product {
  _id: string
  code: string
  nameUr: string
  nameEn: string
  commission: string
  labor: string
  market: string
  munshiana: string
  fare: string
  isActive: boolean
}

export interface Marfat {
  _id: string
  code: string
  landownerUr: string
  landownerEn: string
  marfatUr: string
  marfatEn: string
  landownerParty?: string | Party | null
  isActive: boolean
}

export interface BillCharges {
  commission?: number
  fare?: number
  expense?: number
  labor?: number
  market?: number
  munshiana?: number
  storage?: number
  store?: number
  cashBill?: number
  payment?: number
}

export interface SaleBill {
  _id: string
  invoice: string
  date: string
  landowner: string
  landownerParty?: string | null
  marfat?: string | Marfat | null
  marfatName: string
  item: string
  marka: string
  vehicle: string
  totalNag: number
  lines: Array<{
    _id?: string
    party?: string | null
    name: string
    pieces: number
    rate: number
    item: string
    lagana: number
    traderRate: number
    amount: number
  }>
  charges: BillCharges
  lagana?: number
  diffAccount?: number
  grossAmount: number
  totalExpense: number
  netAmount: number
  average: number
}

export interface PurchaseBill {
  _id: string
  invoice: string
  date: string
  landowner: string
  landownerParty?: string | null
  marfat?: string | Marfat | null
  marfatName: string
  item: string
  marka: string
  vehicle: string
  totalNag: number
  lines: Array<{
    _id?: string
    pieces: number
    rate: number
    item: string
    traderRate: number
    amount: number
  }>
  charges: BillCharges
  grossAmount: number
  totalExpense: number
  netAmount: number
  average: number
}

export interface Voucher {
  _id: string
  invoice: string
  date: string
  type: 'debit' | 'credit' | 'recovery'
  party: string | Party
  partyCode: string
  partyName: string
  cashAccount: string
  details: string
  marfat: string
  amount: number
  bank: string
}

export interface LedgerEntry {
  _id: string
  date: string
  party: string | Party
  partyCode: string
  invoice: string
  source: string
  particulars: string
  marfat: string
  item: string
  vehicle: string
  pieces: number
  rate: number
  debit: number
  credit: number
  balance?: number
}
