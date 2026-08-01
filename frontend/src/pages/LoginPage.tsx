import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Lock, Mail } from 'lucide-react'
import { applyDir } from '@/i18n'
import { ApiClientError } from '@/lib/api'
import { authApi } from '@/lib/mandiApi'
import {
  SHOP_ADDRESS_UR,
  SHOP_NAME_EN,
  SHOP_NAME_UR,
  SHOP_TAGLINE_UR,
} from '@/lib/shopInfo'
import { cn } from '@/lib/utils'

/** Login — fixed viewport, no page scroll */
export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const restoreAppDir = () => {
    const saved = localStorage.getItem('sabzi_lang') || 'ur'
    applyDir(saved.startsWith('ur') ? 'ur' : 'en')
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (submitting) return
    setSubmitting(true)
    try {
      const data = await authApi.login(email.trim(), password)
      const token = data.accessToken || data.token
      if (!token) throw new Error('No access token in login response')
      localStorage.setItem('sabzi_token', token)
      localStorage.setItem('sabzi_auth', '1')
      if (data.user) {
        localStorage.setItem('sabzi_user', JSON.stringify(data.user))
      }
      toast.success('Logged in successfully')
      // Restore app RTL/LTR before MandiShell paints (form stays LTR via local dir)
      restoreAppDir()
      navigate('/home')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Login failed'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div lang="en" dir="ltr" className="relative h-full min-h-0 overflow-hidden text-white">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <img
          src="/login-bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover animate-[login-bg-drift_28s_ease-in-out_infinite_alternate]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(8,40,28,0.3)_0%,rgba(6,28,22,0.62)_50%,rgba(4,18,16,0.9)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/70" />
      </div>

      <main className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center px-4 py-3 sm:px-6">
        <div className="w-full max-w-sm shrink-0 animate-[login-rise_0.85s_ease-out_both] sm:max-w-md">
          <div className="mb-3 text-center sm:mb-4">
            <h1
              className="font-urdu mx-auto max-w-sm text-base leading-snug font-bold text-white drop-shadow-md sm:text-lg"
              dir="rtl"
              lang="ur"
            >
              {SHOP_NAME_UR}
            </h1>
            <p className="mx-auto mt-0.5 max-w-sm text-[10px] text-emerald-50/80 sm:text-[11px]">
              {SHOP_NAME_EN}
            </p>
            <p className="font-urdu mt-1.5 text-[11px] text-amber-100/90 sm:text-xs" dir="rtl" lang="ur">
              {SHOP_TAGLINE_UR}
            </p>
            <p className="font-urdu mx-auto mt-1 max-w-xs text-[10px] text-white/65" dir="rtl" lang="ur">
              {SHOP_ADDRESS_UR}
            </p>
          </div>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="rounded-2xl border border-white/15 bg-[#0a1f1a]/75 p-4 shadow-xl backdrop-blur-md sm:p-5"
          >
            <div className="mb-3 text-center">
              <h2 className="text-sm font-bold tracking-tight text-white sm:text-base">
                Sign in to your shop
              </h2>
              <p className="mt-0.5 text-[11px] text-emerald-100/70">Enter your account details below</p>
            </div>

            <div className="space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold tracking-wide text-emerald-100/85">
                  Email
                </span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-200/55" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/10 pe-3 ps-10 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/50 focus:bg-white/15"
                    placeholder="owner@shop.com"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold tracking-wide text-emerald-100/85">
                  Password
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-emerald-200/55" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/15 bg-white/10 pe-3 ps-10 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-300/50 focus:bg-white/15"
                    autoComplete="current-password"
                  />
                </div>
              </label>

              {error ? <p className="text-xs font-medium text-rose-300">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'flex h-12 w-full items-center justify-center rounded-xl bg-[#0d5f86] py-3 text-sm font-bold text-white shadow-lg shadow-[#0d5f86]/40 transition hover:bg-[#0a4c6b] disabled:opacity-60'
                )}
              >
                {submitting ? 'Logging in…' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <style>{`
        @keyframes login-rise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-bg-drift {
          from { transform: scale(1.05) translate3d(0, 0, 0); }
          to { transform: scale(1.1) translate3d(-1%, 0.5%, 0); }
        }
      `}</style>
    </div>
  )
}
