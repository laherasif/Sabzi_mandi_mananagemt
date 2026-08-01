import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { MandiDatePicker } from '@/components/mandi/MandiDatePicker'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiUrduInput } from '@/components/mandi/MandiUrduInput'
import { cn } from '@/lib/utils'
import { ApiClientError } from '@/lib/api'
import { ledgerApi, partiesApi, vouchersApi } from '@/lib/mandiApi'
import { partyDisplayName } from '@/lib/party'
import type { LedgerEntry, Party, Voucher } from '@/lib/types'

interface Ctx {
  lang: 'en' | 'ur'
}

type Mode = 'debit' | 'credit' | 'recovery'

interface LedgerRow {
  id: string
  invoice: string
  date: string
  broker: string
  details: string
  debit: number
  credit: number
}

interface BanamRow {
  id: string
  invoice: string
  date: string
  code: string
  name: string
  description: string
  marfat: string
  amount: number
  bank: string
}

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

function formatRs(n: number) {
  return new Intl.NumberFormat('en-PK').format(Math.abs(n))
}

function isMode(v: string | null): v is Mode {
  return v === 'debit' || v === 'credit' || v === 'recovery'
}

function mapVoucherToRow(v: Voucher): BanamRow {
  const party = typeof v.party === 'object' && v.party ? (v.party as Party & { name?: string; nameUrdu?: string }) : null
  const name =
    v.partyName ||
    party?.nameUr ||
    party?.nameEn ||
    (party as { nameUrdu?: string } | null)?.nameUrdu ||
    (party as { name?: string } | null)?.name ||
    ''
  const code = v.partyCode || party?.code || (party?._id ? String(party._id).slice(-6).toUpperCase() : '')
  return {
    id: v._id,
    invoice: v.invoice,
    date: v.date,
    code,
    name: name || '—',
    description: v.details || '',
    marfat: v.marfat || '—',
    amount: Number(v.amount) || 0,
    bank: v.bank || v.cashAccount || '',
  }
}

function mapLedgerEntry(e: LedgerEntry, party?: Party | null): LedgerRow {
  const p = typeof e.party === 'object' && e.party ? e.party : party
  const broker =
    p?.nameUr ||
    p?.nameEn ||
    (p as { nameUrdu?: string } | null | undefined)?.nameUrdu ||
    (p as { name?: string } | null | undefined)?.name ||
    e.partyCode ||
    ''
  return {
    id: e._id,
    invoice: e.invoice,
    date: e.date,
    broker,
    details: e.particulars || '',
    debit: Number(e.debit) || 0,
    credit: Number(e.credit) || 0,
  }
}

export function BanamPage() {
  const { lang } = useOutletContext<Ctx>()
  const [params] = useSearchParams()
  const typeParam = params.get('type')
  const mode: Mode = isMode(typeParam) ? typeParam : 'debit'
  const amountRef = useRef<HTMLInputElement>(null)
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  const [parties, setParties] = useState<Party[]>([])
  const [invoiceNo, setInvoiceNo] = useState('')
  const [date, setDate] = useState(todayStr())
  const [cashAccount, setCashAccount] = useState('نقدی کھاتہ')
  const [details, setDetails] = useState('')
  const [partyCode, setPartyCode] = useState('')
  const [amount, setAmount] = useState('')
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([])
  const [entryRows, setEntryRows] = useState<BanamRow[]>([])
  const [saving, setSaving] = useState(false)

  const customers = useMemo(
    () => parties.filter((p) => p.accountType === 'customer'),
    [parties]
  )
  const partyList = mode === 'recovery' ? customers : parties
  const selectedParty = partyList.find((p) => p.code === partyCode) || partyList[0] || null

  const loadParties = async () => {
    const list = await partiesApi.list()
    setParties(list)
    return list
  }

  const loadNextInvoice = async (type: Mode) => {
    const { invoice } = await vouchersApi.nextInvoice(type)
    setInvoiceNo(invoice)
  }

  const loadVouchers = async (type: Mode) => {
    const list = await vouchersApi.list(type)
    setEntryRows(list.map(mapVoucherToRow))
  }

  const loadPartyLedger = async (party: Party | null) => {
    if (!party?._id) {
      setLedgerRows([])
      return
    }
    try {
      const data = await ledgerApi.party(party._id)
      setLedgerRows(data.entries.map((e) => mapLedgerEntry(e, data.party)))
      setParties((prev) =>
        prev.map((p) => (p._id === data.party._id ? { ...p, balance: data.balance } : p))
      )
    } catch {
      setLedgerRows([])
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [list] = await Promise.all([
          loadParties(),
          loadNextInvoice(mode),
          loadVouchers(mode),
        ])
        if (cancelled) return
        const filtered = mode === 'recovery' ? list.filter((p) => p.accountType === 'customer') : list
        if (filtered[0] && !filtered.some((p) => p.code === partyCode)) {
          setPartyCode(filtered[0].code)
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    if (!partyList.some((p) => p.code === partyCode) && partyList[0]) {
      setPartyCode(partyList[0].code)
    }
  }, [mode, partyList, partyCode])

  useEffect(() => {
    void loadPartyLedger(selectedParty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParty?._id])

  useEffect(() => {
    if (mode === 'recovery') {
      setAmount((prev) => (prev === '' ? '0' : prev))
    }
    amountRef.current?.focus()
  }, [mode, partyCode])

  const entryAmt = Number(amount) || 0

  const ledgerWithBalance = useMemo(() => {
    let running = 0
    return ledgerRows.map((r) => {
      running += r.debit - r.credit
      return { ...r, balance: running }
    })
  }, [ledgerRows])

  /** سابقہ رقم — from party ledger (debit − credit), not stale party.balance */
  const previousBalance = useMemo(() => {
    if (ledgerWithBalance.length > 0) {
      return ledgerWithBalance[ledgerWithBalance.length - 1].balance
    }
    return selectedParty?.balance ?? 0
  }, [ledgerWithBalance, selectedParty?.balance])

  const ledgerTotals = useMemo(
    () =>
      ledgerRows.reduce(
        (a, r) => ({ debit: a.debit + r.debit, credit: a.credit + r.credit }),
        { debit: 0, credit: 0 }
      ),
    [ledgerRows]
  )

  const entryTotal = useMemo(() => entryRows.reduce((s, r) => s + r.amount, 0), [entryRows])

  const clearForm = () => {
    setDetails('')
    setAmount(mode === 'recovery' ? '0' : '')
    amountRef.current?.focus()
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entryAmt || entryAmt <= 0) {
      toast.error(L('رقم درست درج کریں', 'Enter a valid amount'))
      return
    }
    const party = parties.find((p) => p.code === partyCode) || selectedParty
    if (!party?._id) {
      toast.error(L('پارٹی منتخب کریں', 'Select a party'))
      return
    }
    if (saving) return

    const detailText =
      details.trim() ||
      (mode === 'debit' ? 'بنام' : mode === 'credit' ? 'جمع' : 'اُگراہی')

    setSaving(true)
    try {
      await vouchersApi.create({
        invoice: invoiceNo,
        date,
        type: mode,
        party: party._id,
        cashAccount,
        details: detailText,
        amount: entryAmt,
        marfat: '',
        bank: cashAccount,
      })
      toast.success(L('انٹری محفوظ ہو گئی', 'Entry saved successfully'))
      clearForm()
      await Promise.all([loadVouchers(mode), loadNextInvoice(mode), loadPartyLedger(party)])
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : L('محفوظ ناکام', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const removeEntry = async (id: string) => {
    try {
      await vouchersApi.remove(id)
      setEntryRows((prev) => prev.filter((r) => r.id !== id))
      toast.message(L('انٹری حذف', 'Entry removed'))
      if (selectedParty) void loadPartyLedger(selectedParty)
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : L('حذف ناکام', 'Delete failed'))
    }
  }

  const prevDisplay = `${previousBalance < 0 ? '-' : ''}${formatRs(previousBalance)}${previousBalance > 0 ? '-' : ''}`

  const amountLabel =
    mode === 'debit'
      ? L('بنام Rs', 'Debit Rs')
      : mode === 'credit'
        ? L('جمع Rs', 'Credit Rs')
        : L('اُگراہی-RS', 'Recovery-RS')

  const entriesTitle =
    mode === 'debit'
      ? L('بنام رقم', 'Debit Amount')
      : mode === 'credit'
        ? L('جمع رقم', 'Credit Amount')
        : L('اُگراہی-رقم', 'Recovery Amount')

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      {/* Link-based mode tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-md border border-[#7aa8c4] bg-white text-sm font-bold shadow-sm">
          {(
            [
              ['debit', 'بنام رقم', 'Debit'],
              ['credit', 'جمع رقم', 'Credit'],
              ['recovery', 'وصولی رقم', 'Recovery'],
            ] as const
          ).map(([key, ur, en]) => (
            <Link
              key={key}
              to={`/payments?type=${key}`}
              className={cn(
                'px-4 py-2 transition',
                mode === key ? 'bg-[#0d5f86] text-white' : 'text-[#0d5f86] hover:bg-sky-50',
                lang === 'ur' && 'font-urdu'
              )}
            >
              {L(ur, en)}
            </Link>
          ))}
        </div>
        <MandiHomeLink lang={lang} />
      </div>

      {/* Mode-specific entry form */}
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="rounded-md border border-[#8eb8d0] bg-[#c5e0ef] p-4 shadow-sm"
      >
        {mode === 'recovery' ? (
          <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
            <FormCol label="#Inv" className="w-[72px] shrink-0">
              <input
                readOnly
                value={invoiceNo}
                className="mandi-input mandi-code"
                dir="ltr"
              />
            </FormCol>

            <FormCol label="#Date" className="w-[11.5rem]">
              <MandiDatePicker value={date} onChange={setDate} lang={lang} className="w-full" />
            </FormCol>

            <FormCol label={L('#Cus نام', '#Cus Name')} className="min-w-[180px] flex-[1.1]">
              <select
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value)}
                className={cn('mandi-input font-semibold', lang === 'ur' && 'font-urdu')}
              >
                {partyList.map((p) => (
                  <option key={p._id} value={p.code}>
                    {partyDisplayName(p, lang)}
                  </option>
                ))}
              </select>
            </FormCol>

            <FormCol label={L('تفصیلات', 'Details')} className="min-w-[200px] flex-[1.4]">
              {lang === 'ur' ? (
                <MandiUrduInput value={details} onChange={setDetails} />
              ) : (
                <input
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="mandi-input"
                />
              )}
            </FormCol>

            <FormCol label={L('اُگراہی-RS', 'Recovery-RS')} className="w-[120px]">
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                className="mandi-input text-center text-base font-bold tabular-nums text-[#b45309]"
                dir="ltr"
                placeholder="0.00"
              />
            </FormCol>

            <FormCol label={L('سابقہ رقم', 'Prev. bal.')} className="w-[128px]">
              <input
                readOnly
                value={prevDisplay}
                className="mandi-input bg-[#eceff3] text-center font-bold tabular-nums"
                dir="ltr"
              />
            </FormCol>

            <div className="flex w-[112px] shrink-0 flex-col justify-end self-end">
              <span className="mb-1.5 block h-5 shrink-0" aria-hidden />
              <button
                type="submit"
                disabled={saving}
                className={cn('mandi-submit mandi-submit-outline', lang === 'ur' && 'font-urdu')}
              >
                {L('محفوظ کریں', 'Submit')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
            <FormCol label={L('انوائس #', 'Invoice #')} className="w-[72px] shrink-0">
              <input
                readOnly
                value={invoiceNo}
                className="mandi-input mandi-code"
                dir="ltr"
              />
            </FormCol>

            <FormCol label={L('تاریخ', 'Date')} className="w-[11.5rem]">
              <MandiDatePicker value={date} onChange={setDate} lang={lang} className="w-full" />
            </FormCol>

            <FormCol label={L('نقدی کھاتہ', 'Cash A/c')} className="w-[148px]">
              <select
                value={cashAccount}
                onChange={(e) => setCashAccount(e.target.value)}
                className={cn('mandi-input', lang === 'ur' && 'font-urdu text-center')}
              >
                <option value="نقدی کھاتہ">{L('نقدی کھاتہ', 'Cash')}</option>
                <option value="بینک کھاتہ">{L('بینک کھاتہ', 'Bank')}</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Easypaisa">Easypaisa</option>
              </select>
            </FormCol>

            <FormCol label={L('تفصیلات', 'Details')} className="min-w-[160px] flex-1">
              {lang === 'ur' ? (
                <MandiUrduInput value={details} onChange={setDetails} />
              ) : (
                <input
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="mandi-input"
                />
              )}
            </FormCol>

            <FormCol label={L('بزرگر معرفت', 'Broker / Party')} className="min-w-[180px] flex-[1.2]">
              <select
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value)}
                className={cn('mandi-input font-semibold', lang === 'ur' && 'font-urdu')}
              >
                {partyList.map((p) => (
                  <option key={p._id} value={p.code}>
                    {partyDisplayName(p, lang)}
                  </option>
                ))}
              </select>
            </FormCol>

            <FormCol label={amountLabel} className="w-[120px]">
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                className="mandi-input text-center text-base font-bold tabular-nums text-[#b45309]"
                dir="ltr"
                placeholder="0.00"
              />
            </FormCol>

            <FormCol label={L('سابقہ رقم', 'Prev. bal.')} className="w-[128px]">
              <input
                readOnly
                value={prevDisplay}
                className="mandi-input bg-[#eceff3] text-center font-bold tabular-nums"
                dir="ltr"
              />
            </FormCol>

            <div className="flex w-[112px] shrink-0 flex-col justify-end self-end">
              <span className="mb-1.5 block h-5 shrink-0" aria-hidden />
              <button
                type="submit"
                disabled={saving}
                className={cn('mandi-submit', lang === 'ur' && 'font-urdu')}
              >
                {L('محفوظ کریں', 'Submit')}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Tables */}
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
        <TableBlock title={L('کھاتہ پارٹی لیجر', 'Party Ledger')} lang={lang}>
          <thead>
            <tr>
              {mode === 'recovery' ? (
                <>
                  <Th>INV</Th>
                  <Th>DATE</Th>
                  <Th>NARATION</Th>
                  <Th>{L('بنام', 'Debit')}</Th>
                  <Th>{L('جمع', 'Credit')}</Th>
                  <Th>Balance</Th>
                </>
              ) : (
                <>
                  <Th>{L('انوائس', 'Inv')}</Th>
                  <Th>{L('تاریخ', 'Date')}</Th>
                  <Th>{L('بزرگر نام', 'Party')}</Th>
                  <Th>{L('تفصیلات', 'Details')}</Th>
                  <Th>{L('بنام', 'Debit')}</Th>
                  <Th>{L('جمع', 'Credit')}</Th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {ledgerRows.length === 0 ? (
              <EmptyRow
                cols={6}
                text={L('کوئی ریکارڈ نہیں', 'No records')}
                urdu={lang === 'ur'}
              />
            ) : mode === 'recovery' ? (
              ledgerWithBalance.map((r) => (
                <tr key={r.id} className="odd:bg-white even:bg-[#eef6fb]">
                  <Td dir="ltr">{r.invoice}</Td>
                  <Td dir="ltr">{r.date}</Td>
                  <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.details}</Td>
                  <Td dir="ltr">{r.debit ? formatRs(r.debit) : '0'}</Td>
                  <Td dir="ltr">{r.credit ? formatRs(r.credit) : '0'}</Td>
                  <Td dir="ltr" className="font-semibold">
                    {formatRs(r.balance)}
                  </Td>
                </tr>
              ))
            ) : (
              ledgerRows.map((r) => (
                <tr key={r.id} className="odd:bg-white even:bg-[#eef6fb]">
                  <Td dir="ltr">{r.invoice}</Td>
                  <Td dir="ltr">{r.date}</Td>
                  <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.broker}</Td>
                  <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.details}</Td>
                  <Td dir="ltr">{r.debit ? formatRs(r.debit) : '0'}</Td>
                  <Td dir="ltr">{r.credit ? formatRs(r.credit) : '0'}</Td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#dbeaf3] font-bold">
              <td className="px-2 py-1.5" colSpan={mode === 'recovery' ? 3 : 4}>
                {L('ٹوٹل', 'Total')}
              </td>
              <td className="px-2 py-1.5 tabular-nums" dir="ltr">
                {formatRs(ledgerTotals.debit)}
              </td>
              <td className="px-2 py-1.5 tabular-nums" dir="ltr">
                {formatRs(ledgerTotals.credit)}
              </td>
              {mode === 'recovery' && <td />}
            </tr>
          </tfoot>
        </TableBlock>

        <TableBlock title={entriesTitle} lang={lang}>
          <thead>
            <tr>
              {mode === 'recovery' ? (
                <>
                  <Th>INV</Th>
                  <Th>DATE</Th>
                  <Th>CODE</Th>
                  <Th>NAME</Th>
                  <Th>NARATION</Th>
                  <Th>AMOUNT</Th>
                  <Th>BANK</Th>
                  <Th>Action</Th>
                </>
              ) : (
                <>
                  <Th>{L('انوائس', 'Inv')}</Th>
                  <Th>{L('تاریخ', 'Date')}</Th>
                  <Th>{L('کوڈ', 'Code')}</Th>
                  <Th>{L('نام', 'Name')}</Th>
                  <Th>{L('تفصیل', 'Desc')}</Th>
                  <Th>{L('معرفت', 'Marfat')}</Th>
                  <Th>{L('بینک', 'Bank')}</Th>
                  <Th>{L('رقم', 'Amt')}</Th>
                  <Th />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {entryRows.length === 0 ? (
              <EmptyRow
                cols={mode === 'recovery' ? 8 : 9}
                text={L('ابھی کوئی انٹری نہیں', 'No entries yet')}
                urdu={lang === 'ur'}
              />
            ) : (
              entryRows.map((r) => (
                <tr key={r.id} className="odd:bg-white even:bg-[#fff7ed]">
                  <Td dir="ltr">{r.invoice}</Td>
                  <Td dir="ltr">{r.date}</Td>
                  <Td dir="ltr">{r.code}</Td>
                  <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.name}</Td>
                  <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.description}</Td>
                  {mode === 'recovery' ? (
                    <>
                      <Td dir="ltr" className="font-semibold">
                        {formatRs(r.amount)}
                      </Td>
                      <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.bank}</Td>
                    </>
                  ) : (
                    <>
                      <Td>{r.marfat}</Td>
                      <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.bank}</Td>
                      <Td dir="ltr" className="font-semibold">
                        {formatRs(r.amount)}
                      </Td>
                    </>
                  )}
                  <Td>
                    <button
                      type="button"
                      onClick={() => void removeEntry(r.id)}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#ffe8d6] font-bold text-orange-950">
              <td className="px-2 py-1.5" colSpan={mode === 'recovery' ? 5 : 7}>
                {L('ٹوٹل', 'Total')}
              </td>
              <td className="px-2 py-1.5 tabular-nums" dir="ltr">
                {formatRs(entryTotal)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </TableBlock>
      </div>
    </div>
  )
}

function FormCol({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mandi-label text-center text-[#0f3d54]">{label}</span>
      {children}
    </label>
  )
}

function TableBlock({
  title,
  lang,
  children,
}: {
  title: string
  lang: 'en' | 'ur'
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded border border-[#7aa8c4] bg-white shadow-sm">
      <div className="shrink-0 bg-[#111] px-3 py-2 text-center text-sm font-bold text-white">
        <span className={lang === 'ur' ? 'font-urdu text-base' : ''}>{title}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">{children}</table>
      </div>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap border border-[#333] bg-[#1a1a1a] px-2 py-1.5 text-center text-[11px] font-bold text-white">
      {children}
    </th>
  )
}

function Td({
  children,
  className,
  dir,
}: {
  children?: React.ReactNode
  className?: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <td
      dir={dir}
      className={cn('whitespace-nowrap border border-slate-200 px-2 py-1.5 text-center text-slate-800', className)}
    >
      {children}
    </td>
  )
}

function EmptyRow({ cols, text, urdu }: { cols: number; text: string; urdu?: boolean }) {
  return (
    <tr>
      <td colSpan={cols} className={cn('px-3 py-10 text-center text-slate-400', urdu && 'font-urdu')}>
        {text}
      </td>
    </tr>
  )
}
