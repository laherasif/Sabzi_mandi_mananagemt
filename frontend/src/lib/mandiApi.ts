import { apiDelete, apiGet, apiPost, apiPut } from './api'
import { normalizeParty } from './party'
import type { LedgerEntry, Marfat, Party, Product, PurchaseBill, SaleBill, Voucher } from './types'

export const partiesApi = {
  list: async (params?: { q?: string; type?: string }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.type) qs.set('type', params.type)
    const s = qs.toString()
    const raw = await apiGet<unknown[]>(`/parties${s ? `?${s}` : ''}`)
    return (Array.isArray(raw) ? raw : []).map((p) => normalizeParty(p as Parameters<typeof normalizeParty>[0]))
  },
  nextCode: () => apiGet<{ code: string }>('/parties/next-code'),
  create: async (body: Partial<Party>) => {
    const created = await apiPost<unknown>('/parties', body)
    return normalizeParty(created as Parameters<typeof normalizeParty>[0])
  },
  update: async (id: string, body: Partial<Party>) => {
    const updated = await apiPut<unknown>(`/parties/${id}`, body)
    return normalizeParty(updated as Parameters<typeof normalizeParty>[0])
  },
  remove: (id: string) => apiDelete<Party>(`/parties/${id}`),
}

export const productsApi = {
  list: (q?: string) => apiGet<Product[]>(`/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  nextCode: () => apiGet<{ code: string }>('/products/next-code'),
  create: (body: Partial<Product>) => apiPost<Product>('/products', body),
  update: (id: string, body: Partial<Product>) => apiPut<Product>(`/products/${id}`, body),
  remove: (id: string) => apiDelete<Product>(`/products/${id}`),
}

export const marfatApi = {
  list: (q?: string) => apiGet<Marfat[]>(`/marfat${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  nextCode: () => apiGet<{ code: string }>('/marfat/next-code'),
  create: (body: Partial<Marfat>) => apiPost<Marfat>('/marfat', body),
  update: (id: string, body: Partial<Marfat>) => apiPut<Marfat>(`/marfat/${id}`, body),
  remove: (id: string) => apiDelete<Marfat>(`/marfat/${id}`),
}

export const salesApi = {
  list: (q?: string) => apiGet<SaleBill[]>(`/sales${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  nextInvoice: () => apiGet<{ invoice: string }>('/sales/next-invoice'),
  create: (body: unknown) => apiPost<SaleBill>('/sales', body),
  update: (id: string, body: unknown) => apiPut<SaleBill>(`/sales/${id}`, body),
  remove: (id: string) => apiDelete<{ id: string }>(`/sales/${id}`),
}

export const purchasesApi = {
  list: (q?: string) => apiGet<PurchaseBill[]>(`/purchases${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  nextInvoice: () => apiGet<{ invoice: string }>('/purchases/next-invoice'),
  create: (body: unknown) => apiPost<PurchaseBill>('/purchases', body),
  update: (id: string, body: unknown) => apiPut<PurchaseBill>(`/purchases/${id}`, body),
  remove: (id: string) => apiDelete<{ id: string }>(`/purchases/${id}`),
}

export const customerPurchasesApi = {
  list: (q?: string) =>
    apiGet<unknown[]>(`/customer-purchases${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  nextInvoice: () => apiGet<{ invoice: string }>('/customer-purchases/next-invoice'),
  create: (body: unknown) => apiPost<unknown>('/customer-purchases', body),
  remove: (id: string) => apiDelete<{ id: string }>(`/customer-purchases/${id}`),
}

export const vouchersApi = {
  list: (type?: string) => apiGet<Voucher[]>(`/vouchers${type ? `?type=${type}` : ''}`),
  nextInvoice: (type: string) =>
    apiGet<{ invoice: string }>(`/vouchers/next-invoice?type=${type}`),
  create: (body: unknown) => apiPost<Voucher>('/vouchers', body),
  remove: (id: string) => apiDelete<{ id: string }>(`/vouchers/${id}`),
}

export const ledgerApi = {
  list: (params?: { party?: string; code?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.party) qs.set('party', params.party)
    if (params?.code) qs.set('code', params.code)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return apiGet<LedgerEntry[]>(`/ledger${s ? `?${s}` : ''}`)
  },
  party: (id: string) =>
    apiGet<{ party: Party; entries: LedgerEntry[]; balance: number }>(`/ledger/party/${id}`),
  summary: () =>
    apiGet<{
      counts: {
        parties: number
        customers: number
        sales: number
        purchases: number
        vouchers: number
        products: number
        today: number
        todaySales: number
        todayPurchases: number
        todayVouchers: number
        bills: number
      }
      dayBook: Array<{ nameUr: string; nameEn: string; banam: number; jama: number }>
      customerDebits: Party[]
    }>('/ledger/summary'),
}

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<{
      accessToken?: string
      token?: string
      user: { id: string; name: string; email: string; role?: string }
      business?: { id: string; name: string; nameUrdu?: string; defaultLanguage?: string }
    }>('/auth/login', {
      email,
      password,
    }),
  register: (name: string, email: string, password: string) =>
    apiPost<{
      accessToken?: string
      token?: string
      user: { id: string; name: string; email: string; role?: string }
    }>('/auth/register', { name, email, password }),
}
