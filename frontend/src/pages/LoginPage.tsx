import { CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, type Location } from 'react-router'
import { FunnelTrail } from '../brand/FunnelTrail.tsx'
import { LeadNexiLogo } from '../brand/LeadNexiMark.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Input } from '../components/ui/Input.tsx'
import { useLogin, useStartSession } from '../features/auth/hooks.ts'
import { LoginTransition, type LoginPhase } from '../features/auth/LoginTransition.tsx'
import { ApiError } from '../lib/api.ts'
import { useSessionStatus, useToken } from '../lib/session.ts'

type Field = 'email' | 'password'

/** O loop fica na tela pelo menos isso, para não "piscar" quando o login é instantâneo */
const MIN_LOOP_MS = 400
/** Duração da confirmação (ponte acende + símbolo respira) antes de abrir o app */
const DONE_MS = 750

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function LoginPage() {
  const token = useToken()
  const sessionStatus = useSessionStatus()
  const location = useLocation()
  const login = useLogin()
  const startSession = useStartSession()
  const [phase, setPhase] = useState<LoginPhase | null>(null)
  const [shaking, setShaking] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState<{ field: Field; message: string } | null>(null)

  // Já logado (ou acabou de entrar): volta para a página que pediu o login
  if (token) return <Navigate to={redirectTarget(location.state)} replace />
  // Ainda restaurando a sessão: não mostra o formulário à toa
  if (sessionStatus === 'checking') return <div aria-busy="true" className="min-h-screen" />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')

    const invalid = validate(email, password)
    setFieldError(invalid)
    if (invalid) {
      ;(form.elements.namedItem(invalid.field) as HTMLInputElement).focus()
      return
    }

    // Loop enquanto o servidor responde; confirmação curta; só então o app abre
    const startedAt = Date.now()
    setPhase('loading')
    try {
      const session = await login.mutateAsync({ email, password })
      if (!prefersReducedMotion()) {
        await wait(MIN_LOOP_MS - (Date.now() - startedAt))
        setPhase('done')
        await wait(DONE_MS)
      }
      startSession(session)
    } catch {
      // Volta ao formulário com a mensagem (login.error) e a tremida
      setPhase(null)
      setShaking(true)
    }
  }

  const error = fieldError?.message ?? (login.error ? loginErrorMessage(login.error) : null)

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <title>Entrar · LeadNexi</title>
      {phase && <LoginTransition phase={phase} />}

      <main className="flex flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-10">
        <LeadNexiLogo size={40} />

        <div className="flex flex-1 items-start justify-center pt-16 pb-12 sm:items-center sm:py-12">
          <div className="w-full max-w-[360px]">
            <h1 className="text-app-title">Entrar</h1>
            <p className="mt-2 text-body text-slate-400">Acesse seu funil de vendas.</p>

            <form
              noValidate
              onSubmit={(event) => void handleSubmit(event)}
              onAnimationEnd={() => setShaking(false)}
              className={`mt-8 flex flex-col gap-5 ${shaking ? 'motion-safe:animate-shake' : ''}`}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-small text-slate-300">
                  E-mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="voce@empresa.com"
                  icon={Mail}
                  aria-invalid={fieldError?.field === 'email'}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-small text-slate-300">
                  Senha
                </label>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  icon={LockKeyhole}
                  aria-invalid={fieldError?.field === 'password'}
                  aria-describedby={error ? 'login-error' : undefined}
                  trailing={
                    <button
                      type="button"
                      aria-label="Mostrar senha"
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((shown) => !shown)}
                      className="grid size-9 cursor-pointer place-items-center rounded-sm text-slate-400 transition-colors hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden size={18} strokeWidth={1.75} />
                      ) : (
                        <Eye aria-hidden size={18} strokeWidth={1.75} />
                      )}
                    </button>
                  }
                />
              </div>

              {error && (
                <p
                  id="login-error"
                  role="alert"
                  className="flex items-start gap-2 text-small text-danger"
                >
                  <CircleAlert aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
                  {error}
                </p>
              )}

              <Button type="submit" disabled={login.isPending} className="w-full">
                {login.isPending ? (
                  <>
                    <LoaderCircle aria-hidden size={18} strokeWidth={1.75} className="animate-spin" />
                    Entrando…
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <aside className="hidden flex-col justify-center border-l border-slate-tint bg-navy-900 bg-dot-grid px-16 lg:flex">
        <p className="text-display">
          Do primeiro direct
          <br />
          <span className="text-violet-300">à venda fechada.</span>
        </p>
        <p className="mt-6 text-lead text-slate-300">Instagram, CRM e WhatsApp — conectados.</p>
        <FunnelTrail className="mt-16 max-w-xl" />
      </aside>
    </div>
  )
}

function validate(email: string, password: string): { field: Field; message: string } | null {
  if (!email) return { field: 'email', message: 'Informe seu e-mail.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { field: 'email', message: 'Digite um e-mail válido.' }
  }
  if (!password) return { field: 'password', message: 'Informe sua senha.' }
  return null
}

function loginErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 401) return 'E-mail ou senha inválidos.'
  if (error instanceof ApiError && error.status === 429) return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  if (error instanceof ApiError && error.status < 500) return 'Confira o e-mail e a senha.'
  return 'Não foi possível conectar ao servidor. Tente de novo em instantes.'
}

function redirectTarget(state: unknown): string {
  const from = (state as { from?: Location } | null)?.from
  return from ? `${from.pathname}${from.search}` : '/'
}
