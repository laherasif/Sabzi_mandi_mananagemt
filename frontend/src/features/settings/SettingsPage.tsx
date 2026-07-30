import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/shared/LoadingState'
import { useGetBusinessQuery, useUpdateBusinessMutation } from '@/store/api/businessApi'

const schema = z.object({
  name: z.string().min(2),
  nameUrdu: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  addressUrdu: z.string().optional(),
  city: z.string().optional(),
  ntn: z.string().optional(),
  invoicePrefix: z.string().min(1).max(10),
  thermalPrintWidth: z.enum(['58', '80']),
  defaultLanguage: z.enum(['en', 'ur']),
})

type FormValues = z.infer<typeof schema>

export function SettingsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useGetBusinessQuery()
  const [updateBusiness, { isLoading: saving }] = useUpdateBusinessMutation()

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (data?.data) {
      const b = data.data
      form.reset({
        name: b.name,
        nameUrdu: b.nameUrdu || '',
        phone: b.phone || '',
        address: b.address || '',
        addressUrdu: b.addressUrdu || '',
        city: b.city || '',
        ntn: b.ntn || '',
        invoicePrefix: b.invoicePrefix,
        thermalPrintWidth: String(b.thermalPrintWidth) as '58' | '80',
        defaultLanguage: b.defaultLanguage,
      })
    }
  }, [data, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateBusiness({
        ...values,
        thermalPrintWidth: Number(values.thermalPrintWidth) as 58 | 80,
      }).unwrap()
      toast.success(t('settings.saved'))
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message || t('common.error'))
    }
  })

  if (isLoading) return <LoadingState label={t('common.loading')} />
  if (isError) return <p className="text-danger">{t('common.error')}</p>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl">{t('settings.title')}</h1>
        <p className="text-muted">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <Label>{t('common.name')}</Label>
              <Input {...form.register('name')} />
            </div>
            <div>
              <Label>{t('common.nameUrdu')}</Label>
              <Input className="font-urdu" {...form.register('nameUrdu')} />
            </div>
            <div>
              <Label>{t('auth.phone')}</Label>
              <Input {...form.register('phone')} />
            </div>
            <div>
              <Label>{t('auth.city')}</Label>
              <Input {...form.register('city')} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t('common.address')}</Label>
              <Input {...form.register('address')} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t('common.addressUrdu')}</Label>
              <Input className="font-urdu" dir="rtl" lang="ur" {...form.register('addressUrdu')} />
            </div>
            <div>
              <Label>{t('settings.ntn')}</Label>
              <Input className="ltr-force" {...form.register('ntn')} />
            </div>
            <div>
              <Label>{t('settings.invoicePrefix')}</Label>
              <Input className="ltr-force" {...form.register('invoicePrefix')} />
            </div>
            <div>
              <Label>{t('settings.thermalWidth')}</Label>
              <select
                className="h-12 w-full rounded-xl border-2 border-border bg-white px-3"
                {...form.register('thermalPrintWidth')}
              >
                <option value="58">58mm</option>
                <option value="80">80mm</option>
              </select>
            </div>
            <div>
              <Label>{t('settings.defaultLanguage')}</Label>
              <select
                className="h-12 w-full rounded-xl border-2 border-border bg-white px-3"
                {...form.register('defaultLanguage')}
              >
                <option value="ur">اردو</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
