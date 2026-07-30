import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { BilingualNameFields } from '@/components/shared/BilingualNameFields'
import {
  useCreatePartyMutation,
  useDeletePartyMutation,
  useListPartiesQuery,
  type Party,
} from '@/store/api/partiesApi'
import { formatPkr, pkrToPaisa } from '@/lib/money'

const schema = z.object({
  type: z.enum(['customer', 'supplier', 'agent', 'transporter', 'labour']),
  name: z.string().min(2),
  nameUrdu: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  openingBalancePkr: z.coerce.number(),
  creditLimitPkr: z.coerce.number(),
})

type FormValues = z.infer<typeof schema>

export function PartiesPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [open, setOpen] = useState(false)

  const { data, isLoading, isError } = useListPartiesQuery({
    search: search || undefined,
    type: type || undefined,
    limit: 50,
  })
  const [createParty, { isLoading: creating }] = useCreatePartyMutation()
  const [deleteParty] = useDeletePartyMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'customer',
      name: '',
      nameUrdu: '',
      openingBalancePkr: 0,
      creditLimitPkr: 0,
    },
  })

  const nameValue = form.watch('name')
  const nameUrduValue = form.watch('nameUrdu') || ''

  const parties = data?.data ?? []

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.name'),
        width: '28%',
        align: 'start' as const,
        cell: (row: Party) => (
          <div className="text-start">
            <p className="font-semibold leading-snug">{row.name}</p>
            {row.nameUrdu && (
              <p className="font-urdu text-sm leading-snug text-muted">{row.nameUrdu}</p>
            )}
          </div>
        ),
      },
      {
        key: 'type',
        header: t('common.type'),
        width: '18%',
        align: 'start' as const,
        cell: (row: Party) => t(`parties.types.${row.type}`),
      },
      {
        key: 'phone',
        header: t('common.phone'),
        width: '16%',
        align: 'start' as const,
        cell: (row: Party) => (
          <span className="ltr-force inline-block tabular-nums">{row.phone || '—'}</span>
        ),
      },
      {
        key: 'balance',
        header: t('common.balance'),
        width: '20%',
        align: 'start' as const,
        cell: (row: Party) => (
          <span
            className={
              row.balancePaisa < 0
                ? 'tabular-nums font-semibold text-accent'
                : 'tabular-nums font-semibold text-brand'
            }
          >
            {formatPkr(row.balancePaisa)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        width: '18%',
        align: 'start' as const,
        cell: (row: Party) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={() => {
              if (confirm('Delete this party?')) {
                void deleteParty(row._id)
                  .unwrap()
                  .then(() => toast.success(t('common.deleted')))
                  .catch(() => toast.error(t('common.error')))
              }
            }}
          >
            {t('common.delete')}
          </Button>
        ),
      },
    ],
    [t, deleteParty]
  )

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createParty({
        type: values.type,
        name: values.name,
        nameUrdu: values.nameUrdu,
        phone: values.phone,
        city: values.city,
        openingBalancePaisa: pkrToPaisa(values.openingBalancePkr),
        creditLimitPaisa: pkrToPaisa(values.creditLimitPkr),
      }).unwrap()
      toast.success(t('common.create'))
      setOpen(false)
      form.reset({
        type: 'customer',
        name: '',
        nameUrdu: '',
        openingBalancePkr: 0,
        creditLimitPkr: 0,
      })
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message || t('common.error'))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink lg:text-3xl">{t('parties.title')}</h1>
          <p className="text-muted">{t('parties.subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5" />
          {t('parties.add')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          className="h-12 rounded-xl border-2 border-border bg-white px-4 text-base"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">{t('common.allTypes')}</option>
          {(['customer', 'supplier', 'agent', 'transporter', 'labour'] as const).map((tp) => (
            <option key={tp} value={tp}>
              {t(`parties.types.${tp}`)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState label={t('common.loading')} />}
      {isError && <p className="text-danger">{t('common.error')}</p>}
      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={parties}
          rowKey={(r) => r._id}
          empty={
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title={t('common.noResults')}
              description={t('parties.empty')}
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t('parties.add')}
                </Button>
              }
            />
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('parties.add')}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <Label>{t('common.type')}</Label>
              <select
                className="h-12 w-full rounded-xl border-2 border-border bg-white px-3"
                {...form.register('type')}
              >
                {(['customer', 'supplier', 'agent', 'transporter', 'labour'] as const).map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`parties.types.${tp}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('common.phone')}</Label>
              <Input {...form.register('phone')} />
            </div>
            <div className="sm:col-span-2">
              <BilingualNameFields
                nameValue={nameValue}
                nameUrduValue={nameUrduValue}
                onNameChange={(v) => form.setValue('name', v, { shouldValidate: true })}
                onNameUrduChange={(v) => form.setValue('nameUrdu', v)}
                nameError={form.formState.errors.name?.message}
              />
            </div>
            <div>
              <Label>{t('parties.openingBalance')}</Label>
              <Input type="number" step="0.01" {...form.register('openingBalancePkr')} />
            </div>
            <div>
              <Label>{t('parties.creditLimit')}</Label>
              <Input type="number" step="0.01" {...form.register('creditLimitPkr')} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? t('common.loading') : t('common.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
