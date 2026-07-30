import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLoginMutation } from '@/store/api/authApi'
import { useAppDispatch } from '@/hooks/redux'
import { setCredentials } from '@/store/slices/authSlice'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

/** Login stays English + LTR (no translation / language switcher). */
export function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [login, { isLoading }] = useLoginMutation()

  useEffect(() => {
    const html = document.documentElement
    const prevLang = html.lang
    const prevDir = html.dir
    html.lang = 'en'
    html.dir = 'ltr'
    document.body.dir = 'ltr'
    document.body.classList.remove('font-urdu')
    document.body.classList.add('font-sans-ui')

    return () => {
      // Restore app language direction after leaving login
      const saved = localStorage.getItem('sabzi_lang') || 'ur'
      const isUrdu = saved.startsWith('ur')
      html.lang = isUrdu ? 'ur' : 'en'
      html.dir = isUrdu ? 'rtl' : 'ltr'
      document.body.dir = html.dir
      document.body.classList.toggle('font-urdu', isUrdu)
      document.body.classList.toggle('font-sans-ui', !isUrdu)
      void prevLang
      void prevDir
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await login(values).unwrap()
      dispatch(setCredentials({ accessToken: res.data.accessToken, user: res.data.user }))
      toast.success(res.message || 'Logged in')
      navigate('/')
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message || 'Invalid email or password'
      toast.error(message)
    }
  })

  return (
    <div lang="en" dir="ltr" className="flex min-h-screen items-center justify-center px-4 py-10 font-sans">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
            <Leaf className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl text-brand">Sabzi Mandi</CardTitle>
          <p className="text-muted">Welcome back</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" className="ltr-force" {...register('email')} />
              {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="ltr-force"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Login'}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted">
            <Link to="/register" className="font-semibold text-brand hover:underline">
              New shop? Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
