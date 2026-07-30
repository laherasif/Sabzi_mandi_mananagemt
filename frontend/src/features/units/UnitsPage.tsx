import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Ruler } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { BilingualNameFields } from '@/components/shared/BilingualNameFields'
import { suggestUrduName } from '@/lib/urduSuggest'
import {
  useCreateUnitMutation,
  useDeleteUnitMutation,
  useListUnitsQuery,
  type Unit,
} from '@/store/api/unitsApi'

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  nameUrdu: z.string().optional(),
  factorToBase: z.coerce.number().positive(),
  isBase: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export function UnitsPage() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError } = useListUnitsQuery()
  const [createUnit, { isLoading: creating }] = useCreateUnitMutation()
  const [deleteUnit] = useDeleteUnitMutation()

  const units = data?.data ?? []
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', nameUrdu: '', factorToBase: 1, isBase: false },
  })

  const nameValue = form.watch('name')
  const nameUrduValue = form.watch('nameUrdu') || ''

  const columns = useMemo(
    () => [
      {
        key: 'code',
        header: t('units.code'),
        width: '14%',
        align: 'start' as const,
        cell: (row: Unit) => (
          <span className="font-mono font-bold tracking-wide">{row.code}</span>
        ),
      },
      {
        key: 'name',
        header: t('common.name'),
        width: '30%',
        align: 'start' as const,
        cell: (row: Unit) => (
          <div className="text-start">
            <p className="font-semibold leading-snug">{row.name}</p>
            {row.nameUrdu && (
              <p className="font-urdu text-sm leading-snug text-muted">{row.nameUrdu}</p>
            )}
          </div>
        ),
      },
      {
        key: 'factor',
        header: t('units.factor'),
        width: '18%',
        align: 'start' as const,
        cell: (row: Unit) => <span className="tabular-nums font-semibold">{row.factorToBase}</span>,
      },
      {
        key: 'base',
        header: t('units.base'),
        width: '18%',
        align: 'start' as const,
        cell: (row: Unit) =>
          row.isBase ? (
            <span className="rounded-lg bg-brand-light px-2 py-1 text-xs font-bold text-brand-dark">
              BASE
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        width: '20%',
        align: 'start' as const,
        cell: (row: Unit) =>
          row.isBase ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() => {
                if (confirm('Delete unit?')) {
                  void deleteUnit(row._id)
                    .unwrap()
                    .then(() => toast.success(t('common.deleted')))
                    .catch((e: { data?: { message?: string } }) =>
                      toast.error(e?.data?.message || t('common.error'))
                    )
                }
              }}
            >
              {t('common.delete')}
            </Button>
          ),
      },
    ],
    [t, deleteUnit]
  )

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createUnit({
        ...values,
        nameUrdu: values.nameUrdu || suggestUrduName(values.name) || undefined,
      }).unwrap()
      toast.success(t('common.create'))
      setOpen(false)
      form.reset({ code: '', name: '', nameUrdu: '', factorToBase: 1, isBase: false })
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message || t('common.error'))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">{t('units.title')}</h1>
          <p className="text-muted">{t('units.subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5" />
          {t('units.add')}
        </Button>
      </div>

      {isLoading && <LoadingState label={t('common.loading')} />}
      {isError && <p className="text-danger">{t('common.error')}</p>}
      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={units}
          rowKey={(r) => r._id}
          empty={
            <EmptyState
              icon={<Ruler className="h-10 w-10" />}
              title={t('common.noResults')}
              description={t('units.empty')}
            />
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('units.add')}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <div>
              <Label>{t('units.code')}</Label>
              <Input className="ltr-force" {...form.register('code')} placeholder="MANN" />
            </div>
            <BilingualNameFields
              nameValue={nameValue}
              nameUrduValue={nameUrduValue}
              onNameChange={(v) => form.setValue('name', v, { shouldValidate: true })}
              onNameUrduChange={(v) => form.setValue('nameUrdu', v)}
              nameError={form.formState.errors.name?.message}
            />
            <div>
              <Label>{t('units.factor')}</Label>
              <Input type="number" step="0.0001" {...form.register('factorToBase')} />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" {...form.register('isBase')} />
              {t('units.base')}
            </label>
            <div className="flex justify-end gap-2 pt-2">
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
