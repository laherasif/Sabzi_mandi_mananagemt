import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { BilingualNameFields } from '@/components/shared/BilingualNameFields'
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useListProductsQuery,
  type Product,
} from '@/store/api/productsApi'
import { useListUnitsQuery } from '@/store/api/unitsApi'
import { formatPkr, pkrToPaisa } from '@/lib/money'

const schema = z.object({
  name: z.string().min(1),
  nameUrdu: z.string().optional(),
  category: z.enum(['vegetable', 'fruit', 'other']),
  baseUnitId: z.string().min(1),
  purchaseRatePkr: z.coerce.number().min(0),
  saleRatePkr: z.coerce.number().min(0),
  minStockAlert: z.coerce.number().min(0),
  openingStockInBaseUnit: z.coerce.number().min(0),
  sku: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function ProductsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const { data, isLoading, isError } = useListProductsQuery({ search: search || undefined, limit: 50 })
  const { data: unitsData } = useListUnitsQuery()
  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [deleteProduct] = useDeleteProductMutation()

  const units = unitsData?.data ?? []
  const products = data?.data ?? []
  const baseKg = units.find((u) => u.code === 'KG') || units[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      nameUrdu: '',
      category: 'vegetable',
      purchaseRatePkr: 0,
      saleRatePkr: 0,
      minStockAlert: 0,
      openingStockInBaseUnit: 0,
      baseUnitId: '',
    },
  })

  const nameValue = form.watch('name')
  const nameUrduValue = form.watch('nameUrdu') || ''

  useEffect(() => {
    if (baseKg?._id && !form.getValues('baseUnitId')) {
      form.setValue('baseUnitId', baseKg._id)
    }
  }, [baseKg, form])

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('common.name'),
        width: '28%',
        align: 'start' as const,
        cell: (row: Product) => (
          <div className="text-start">
            <p className="font-semibold leading-snug">{row.name}</p>
            {row.nameUrdu && (
              <p className="font-urdu text-sm leading-snug text-muted">{row.nameUrdu}</p>
            )}
          </div>
        ),
      },
      {
        key: 'category',
        header: t('products.category'),
        width: '16%',
        align: 'start' as const,
        cell: (row: Product) => t(`products.categories.${row.category}`),
      },
      {
        key: 'sale',
        header: t('products.saleRate'),
        width: '22%',
        align: 'start' as const,
        cell: (row: Product) => (
          <span className="tabular-nums font-semibold">{formatPkr(row.saleRatePaisa)}</span>
        ),
      },
      {
        key: 'stock',
        header: t('products.stock'),
        width: '16%',
        align: 'start' as const,
        cell: (row: Product) => (
          <span
            className={
              row.stockInBaseUnit <= row.minStockAlert
                ? 'tabular-nums font-bold text-accent'
                : 'tabular-nums font-semibold'
            }
          >
            {row.stockInBaseUnit}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        width: '18%',
        align: 'start' as const,
        cell: (row: Product) => (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={() => {
              if (confirm('Delete product?')) {
                void deleteProduct(row._id)
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
    [t, deleteProduct]
  )

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createProduct({
        name: values.name,
        nameUrdu: values.nameUrdu,
        category: values.category,
        baseUnitId: values.baseUnitId,
        sku: values.sku,
        purchaseRatePaisa: pkrToPaisa(values.purchaseRatePkr),
        saleRatePaisa: pkrToPaisa(values.saleRatePkr),
        minStockAlert: values.minStockAlert,
        openingStockInBaseUnit: values.openingStockInBaseUnit,
      }).unwrap()
      toast.success(t('common.create'))
      setOpen(false)
      form.reset({
        name: '',
        nameUrdu: '',
        category: 'vegetable',
        purchaseRatePkr: 0,
        saleRatePkr: 0,
        minStockAlert: 0,
        openingStockInBaseUnit: 0,
        baseUnitId: baseKg?._id,
      })
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message || t('common.error'))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">{t('products.title')}</h1>
          <p className="text-muted">{t('products.subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5" />
          {t('products.add')}
        </Button>
      </div>

      <Input
        placeholder={t('common.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:max-w-xs"
      />

      {isLoading && <LoadingState label={t('common.loading')} />}
      {isError && <p className="text-danger">{t('common.error')}</p>}
      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={products}
          rowKey={(r) => r._id}
          empty={
            <EmptyState
              icon={<Package className="h-10 w-10" />}
              title={t('common.noResults')}
              description={t('products.empty')}
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t('products.add')}
                </Button>
              }
            />
          }
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('products.add')}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
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
              <Label>{t('products.category')}</Label>
              <select
                className="h-12 w-full rounded-xl border-2 border-border bg-white px-3"
                {...form.register('category')}
              >
                {(['vegetable', 'fruit', 'other'] as const).map((c) => (
                  <option key={c} value={c}>
                    {t(`products.categories.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('common.baseUnit')}</Label>
              <select
                className="h-12 w-full rounded-xl border-2 border-border bg-white px-3"
                {...form.register('baseUnitId')}
              >
                {units.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('products.purchaseRate')}</Label>
              <Input type="number" step="0.01" {...form.register('purchaseRatePkr')} />
            </div>
            <div>
              <Label>{t('products.saleRate')}</Label>
              <Input type="number" step="0.01" {...form.register('saleRatePkr')} />
            </div>
            <div>
              <Label>{t('products.openingStock')}</Label>
              <Input type="number" step="0.01" {...form.register('openingStockInBaseUnit')} />
            </div>
            <div>
              <Label>{t('products.minAlert')}</Label>
              <Input type="number" step="0.01" {...form.register('minStockAlert')} />
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
