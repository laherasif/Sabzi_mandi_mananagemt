import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { BilingualNameFields } from '@/components/shared/BilingualNameFields'
import { useRegisterBusinessMutation } from '@/store/api/authApi'
import { suggestUrduName } from '@/lib/urduSuggest'

const schema = z.object({
  businessName: z.string().min(2),
  businessNameUrdu: z.string().optional(),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  city: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [registerBusiness, { isLoading }] = useRegisterBusinessMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      city: 'Lahore',
      businessName: '',
      businessNameUrdu: '',
      ownerName: '',
      email: '',
      password: '',
    },
  })

  const businessName = form.watch('businessName')
  const businessNameUrdu = form.watch('businessNameUrdu') || ''

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await registerBusiness({
        ...values,
        businessNameUrdu:
          values.businessNameUrdu || suggestUrduName(values.businessName) || undefined,
      }).unwrap()
      toast.success(t('auth.haveAccount'))
      navigate('/login')
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message || t('common.error')
      toast.error(message)
    }
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute end-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
            <Leaf className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">{t('auth.createShop')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <BilingualNameFields
                nameValue={businessName}
                nameUrduValue={businessNameUrdu}
                onNameChange={(v) => form.setValue('businessName', v, { shouldValidate: true })}
                onNameUrduChange={(v) => form.setValue('businessNameUrdu', v)}
                nameLabel={t('auth.businessName')}
                nameUrduLabel={t('auth.businessNameUrdu')}
                nameError={form.formState.errors.businessName?.message}
              />
            </div>
            <div>
              <Label>{t('auth.ownerName')}</Label>
              <Input {...form.register('ownerName')} />
            </div>
            <div>
              <Label>{t('auth.city')}</Label>
              <Input {...form.register('city')} />
            </div>
            <div>
              <Label>{t('auth.email')}</Label>
              <Input type="email" className="ltr-force" {...form.register('email')} />
            </div>
            <div>
              <Label>{t('auth.phone')}</Label>
              <Input type="tel" className="ltr-force" {...form.register('phone')} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t('auth.password')}</Label>
              <Input type="password" className="ltr-force" {...form.register('password')} />
              {form.formState.errors.password && (
                <p className="mt-1 text-sm text-danger">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? t('common.loading') : t('auth.register')}
              </Button>
            </div>
          </form>
          <p className="mt-5 text-center text-sm text-muted">
            <Link to="/login" className="font-semibold text-brand hover:underline">
              {t('auth.haveAccount')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
