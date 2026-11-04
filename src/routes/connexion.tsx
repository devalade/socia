import { useRef, useState } from 'react'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { CircleAlert, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { z } from 'zod'
import { Brand, BrandMark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { getViewerFn } from '@/server/fns/session'

const search = z.object({ redirect: z.string().optional(), mode: z.enum(['signin', 'signup']).optional() })

export const Route = createFileRoute('/connexion')({
  validateSearch: search,
  beforeLoad: async ({ search }) => {
    if (await getViewerFn()) throw redirect({ to: search.redirect?.startsWith('/') ? search.redirect : '/app' })
  },
  head: () => ({ meta: [{ title: 'Connexion · SOCIA' }] }),
  component: SignInPage,
})

type Mode = 'signin' | 'signup'
type FieldKey = 'name' | 'email' | 'password' | 'confirm'
type FieldErrors = Partial<Record<FieldKey, string>>

const FIELD_ORDER: Record<Mode, FieldKey[]> = {
  signin: ['email', 'password'],
  signup: ['name', 'email', 'password', 'confirm'],
}

const INPUT_CLASS = 'h-10 rounded-md focus-visible:outline-none focus-visible:ring-ring/30'

function validate(mode: Mode, values: Record<FieldKey, string>): FieldErrors {
  const errors: FieldErrors = {}
  const email = values.email.trim()

  if (!email) errors.email = 'Saisissez votre adresse e-mail pour continuer.'
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Saisissez une adresse complète, par exemple analyste@organisation.tld.'

  if (!values.password) errors.password = 'Saisissez votre mot de passe.'
  else if (mode === 'signup' && values.password.length < 10) errors.password = 'Choisissez un mot de passe d’au moins 10 caractères.'

  if (mode === 'signup') {
    if (values.name.trim().length < 2) errors.name = 'Saisissez votre nom complet.'
    if (!values.confirm) errors.confirm = 'Confirmez votre mot de passe.'
    else if (values.confirm !== values.password) errors.confirm = 'Les deux mots de passe ne correspondent pas. Saisissez le même mot de passe.'
  }

  return errors
}

function problemFor(status: number | undefined, mode: Mode) {
  if (status === 401) return 'Adresse e-mail ou mot de passe incorrect. Vérifiez la saisie, puis réessayez.'
  if (status === 429) return 'Trop de tentatives. Patientez une minute, puis réessayez.'
  return mode === 'signup'
    ? 'Le compte n’a pas pu être créé. Utilisez une autre adresse e-mail, ou connectez-vous si un compte existe déjà.'
    : 'La connexion a échoué. Vérifiez votre adresse e-mail et votre mot de passe, puis réessayez.'
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-small font-medium text-foreground">
          {label}
        </Label>
        {hint && (
          <span id={`${id}-hint`} className="text-micro text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-micro text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function SignInPage() {
  const { redirect: next, mode: initialMode } = Route.useSearch()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(initialMode ?? 'signin')
  const [values, setValues] = useState<Record<FieldKey, string>>({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const focusRefs = { name: nameRef, email: emailRef, password: passwordRef, confirm: confirmRef }

  function update(field: FieldKey, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setProblem(null)

    const found = validate(mode, values)
    setErrors(found)
    const first = FIELD_ORDER[mode].find((field) => found[field])
    if (first) {
      focusRefs[first].current?.focus()
      return
    }

    setBusy(true)
    try {
      const result =
        mode === 'signin'
          ? await authClient.signIn.email({ email: values.email.trim(), password: values.password, rememberMe: true })
          : await authClient.signUp.email({ email: values.email.trim(), password: values.password, name: values.name.trim() })
      if (result.error) {
        setProblem(problemFor(result.error.status, mode))
        return
      }
      await navigate({ to: next?.startsWith('/') ? next : '/app', replace: true })
    } catch {
      setProblem('Le service d’authentification ne répond pas. Vérifiez votre connexion, puis réessayez.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setMode((current) => (current === 'signin' ? 'signup' : 'signin'))
    setErrors({})
    setProblem(null)
    setReveal(false)
  }

  const passwordDescribedBy =
    [mode === 'signup' ? 'password-hint' : null, errors.password ? 'password-error' : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div aria-hidden className="auth-field pointer-events-none fixed inset-0" />

      <header className="relative flex h-14 items-center justify-between border-b border-border px-5 sm:px-6">
        <Brand />
        <Link
          to="/"
          className="inline-flex h-8 items-center text-small text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          Accueil
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 py-6 sm:px-6 sm:py-12">
        <div className="w-full max-w-auth">
          <div className="grid justify-items-center text-center">
            <BrandMark className="size-8" />
            <h1 className="mt-5 text-2xl leading-7 font-semibold tracking-title text-foreground">
              {mode === 'signin' ? 'Se connecter à SOCIA' : 'Créer votre espace'}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-balance text-muted-foreground">
              {mode === 'signin'
                ? 'Retrouvez vos dossiers, vos hypothèses et vos rapports.'
                : 'Le premier compte créé devient administrateur de l’espace.'}
            </p>
          </div>

          <form noValidate onSubmit={submit} aria-busy={busy} className="mt-8 grid gap-5">
            {mode === 'signup' && (
              <Field id="name" label="Nom complet" error={errors.name}>
                <Input
                  ref={nameRef}
                  id="name"
                  name="name"
                  value={values.name}
                  onChange={(event) => update('name', event.target.value)}
                  autoComplete="name"
                  placeholder="Amina Koffi"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  required
                  className={INPUT_CLASS}
                />
              </Field>
            )}

            <Field id="email" label="Adresse e-mail" error={errors.email}>
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                spellCheck={false}
                value={values.email}
                onChange={(event) => update('email', event.target.value)}
                autoComplete="email"
                placeholder="analyste@organisation.tld"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                required
                className={INPUT_CLASS}
              />
            </Field>

            <Field id="password" label="Mot de passe" hint={mode === 'signup' ? '10 caractères minimum' : undefined} error={errors.password}>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={reveal ? 'text' : 'password'}
                  value={values.password}
                  onChange={(event) => update('password', event.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={passwordDescribedBy}
                  required
                  className={`${INPUT_CLASS} pe-11`}
                />
                <button
                  type="button"
                  onClick={() => setReveal((value) => !value)}
                  aria-label={reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={reveal}
                  className="absolute end-1 top-1 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {reveal ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                </button>
              </div>
            </Field>

            {mode === 'signup' && (
              <Field id="confirm" label="Confirmer le mot de passe" error={errors.confirm}>
                <Input
                  ref={confirmRef}
                  id="confirm"
                  name="confirm"
                  type={reveal ? 'text' : 'password'}
                  value={values.confirm}
                  onChange={(event) => update('confirm', event.target.value)}
                  autoComplete="new-password"
                  aria-invalid={errors.confirm ? true : undefined}
                  aria-describedby={errors.confirm ? 'confirm-error' : undefined}
                  required
                  className={INPUT_CLASS}
                />
              </Field>
            )}

            {problem && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-small leading-5 text-destructive"
              >
                <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{problem}</span>
              </p>
            )}

            <Button type="submit" size="lg" loading={busy} className="mt-1 w-full rounded-md">
              {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
            </Button>
          </form>

          <button
            type="button"
            onClick={switchMode}
            aria-label={mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
            className="group mx-auto mt-5 flex h-6 w-fit items-center gap-1 text-small transition-colors duration-150"
          >
            <span className="text-muted-foreground">{mode === 'signin' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}</span>
            <span className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-150 group-hover:text-brand group-hover:decoration-brand">
              {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
            </span>
          </button>

          <p className="mt-3 flex items-start justify-center gap-2 text-micro leading-5 text-muted-foreground">
            <LockKeyhole aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span className="text-balance">Session chiffrée. Les mots de passe ne sont jamais stockés en clair.</span>
          </p>
        </div>
      </main>

      <footer className="relative hidden h-12 items-center justify-between border-t border-border px-5 text-xs text-muted-foreground sm:flex sm:px-6">
        <span>SOCIA · Accès analyste</span>
        <span>Le SIEM reste votre terrain</span>
      </footer>
    </div>
  )
}
