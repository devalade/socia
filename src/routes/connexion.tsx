import { useState } from 'react'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { z } from 'zod'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { getViewerFn } from '@/server/fns/session'
import { cn } from '@/lib/utils'

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
type Problem = { tone: 'error' | 'info'; message: string } | null

function SignInPage() {
  const { redirect: next, mode: initialMode } = Route.useSearch()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(initialMode ?? 'signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem>(null)
  const [reveal, setReveal] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setProblem(null)
    if (!email.trim() || !password) {
      setProblem({ tone: 'error', message: 'Renseignez votre adresse e-mail et votre mot de passe.' })
      return
    }
    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setProblem({ tone: 'error', message: 'Renseignez votre nom complet.' })
        return
      }
      if (password.length < 10) {
        setProblem({ tone: 'error', message: 'Le mot de passe doit contenir au moins 10 caractères.' })
        return
      }
      if (password !== confirm) {
        setProblem({ tone: 'error', message: 'Les deux mots de passe ne correspondent pas.' })
        return
      }
    }
    setBusy(true)
    try {
      const result =
        mode === 'signin'
          ? await authClient.signIn.email({ email: email.trim(), password, rememberMe: true })
          : await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
      if (result.error) {
        const status = result.error.status
        setProblem({
          tone: 'error',
          message:
            status === 401
              ? 'Adresse e-mail ou mot de passe incorrect.'
              : status === 429
                ? 'Trop de tentatives. Réessayez dans une minute.'
                : mode === 'signup'
                  ? 'Le compte n’a pas pu être créé. Vérifiez l’adresse e-mail et la longueur du mot de passe.'
                  : 'La connexion a échoué. Vérifiez vos informations.',
        })
        return
      }
      await navigate({ to: next?.startsWith('/') ? next : '/app', replace: true })
    } catch {
      setProblem({ tone: 'error', message: 'Le service d’authentification est indisponible. Réessayez.' })
    } finally {
      setBusy(false)
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode)
    setProblem(null)
  }

  return (
    <div className="grid min-h-dvh bg-background layout-auth">
      <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar p-10 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-dots opacity-40" aria-hidden />
        <div className="absolute -top-40 -left-40 signal-glow-lg" aria-hidden />
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" aria-label="Accueil SOCIA">
            <Brand />
          </Link>
          <span className="border border-border px-2 py-1 font-mono text-tiny tracking-label text-muted-foreground uppercase">
            Analyste SOC
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="mb-5 text-meta font-medium tracking-wider text-brand uppercase">Le SIEM reste votre terrain</p>
          <h1 className="text-display-sm leading-display font-semibold tracking-display text-foreground">
            Comprendre l’alerte.
            <br />
            <em className="text-brand">Garder la main.</em>
          </h1>
          <p className="mt-5 max-w-md text-lead leading-7 text-muted-foreground">
            SOCIA structure le raisonnement de l’analyste : faits observés, déductions, hypothèses et informations manquantes. Vous exécutez vos requêtes. Vous décidez.
          </p>

          <div className="mt-9 grid gap-3">
            {[
              'Chaque analyse sépare les faits des hypothèses.',
              'Aucune requête n’est exécutée à votre place.',
              'Le contexte complet reste disponible après interruption.',
            ].map((line) => (
              <div key={line} className="flex items-start gap-3 text-body leading-6 text-subtle">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
                {line}
              </div>
            ))}
          </div>

          <div className="mt-10 border border-border p-4">
            <div className="mb-3 flex items-center justify-between text-micro font-medium tracking-label text-muted-foreground uppercase">
              <span>Analyse initiale</span>
              <span className="text-brand">Faits / hypothèses</span>
            </div>
            <div className="grid gap-2 text-small leading-5 text-subtle">
              <p className="border-l-2 border-success py-1.5 pl-3">
                <span className="font-medium text-success">Fait.</span> Commande PowerShell encodée lancée par winword.exe sur WIN-FIN-042.
              </p>
              <p className="border-l-2 border-warning py-1.5 pl-3">
                <span className="font-medium text-warning">Hypothèse.</span> Exécution d’un document piégé, à confirmer par les journaux de messagerie.
              </p>
              <p className="border-l-2 border-unknown py-1.5 pl-3">
                <span className="font-medium text-muted-foreground">Manque.</span> Hash du document et identité de l’expéditeur.
              </p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-meta text-muted-foreground">
          Les données importées sont traitées comme non fiables. Les clés des fournisseurs restent chiffrées.
        </p>
      </aside>

      <main className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-form">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Brand />
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              Accueil
            </Link>
          </div>

          <div className="mb-7">
            <p className="mb-2 text-meta font-medium tracking-wide text-muted-foreground uppercase">
              {mode === 'signin' ? 'Accès sécurisé' : 'Créer un compte'}
            </p>
            <h2 className="font-display text-4xl leading-poster tracking-poster">
              {mode === 'signin' ? 'Reprendre l’investigation' : 'Rejoindre l’espace analyste'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === 'signin'
                ? 'Connectez-vous pour retrouver vos alertes, vos hypothèses et vos rapports.'
                : 'Le premier compte créé devient administrateur de l’espace.'}
            </p>
          </div>

          <div className="mb-6 flex gap-8 border-b border-border">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={cn(
                'relative h-11 text-xs font-medium text-muted-foreground transition-colors sm:h-9',
                mode === 'signin' && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brand',
              )}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={cn(
                'relative h-11 text-xs font-medium text-muted-foreground transition-colors sm:h-9',
                mode === 'signup' && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brand',
              )}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={submit} className="grid gap-4" noValidate>
            {mode === 'signup' && (
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-mono text-tiny tracking-caps uppercase">Nom complet</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Amina Koffi" className="h-11 sm:h-9" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-mono text-tiny tracking-caps uppercase">Adresse e-mail</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="analyste@organisation.tld" className="h-11 sm:h-9" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="font-mono text-tiny tracking-caps uppercase">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={reveal ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'signin' ? 'Votre mot de passe' : 'Au moins 10 caractères'}
                  className="h-11 pe-10 sm:h-9"
                />
                <button
                  type="button"
                  onClick={() => setReveal((value) => !value)}
                  aria-label={reveal ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {reveal ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                </button>
              </div>
            </div>
            {mode === 'signup' && (
              <div className="grid gap-2">
                <Label htmlFor="confirm" className="font-mono text-tiny tracking-caps uppercase">Confirmer le mot de passe</Label>
                <Input id="confirm" type={reveal ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" className="h-11 sm:h-9" />
              </div>
            )}

            {problem && (
              <p
                role="alert"
                className={cn(
                  'rounded-md border px-3 py-2 text-xs leading-5',
                  problem.tone === 'error' ? 'border-destructive/25 bg-destructive/8 text-destructive' : 'border-info/25 bg-info/8 text-info',
                )}
              >
                {problem.message}
              </p>
            )}

            <Button type="submit" size="lg" loading={busy} className="mt-2 h-12 w-full sm:h-10">
              {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
              {!busy && <ArrowRight aria-hidden />}
            </Button>
          </form>

          <p className="mt-5 flex items-start gap-2 text-meta leading-5 text-muted-foreground">
            <LockKeyhole aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Session chiffrée par cookie HttpOnly. Les mots de passe sont hachés, jamais stockés en clair.
          </p>

          <div className="mt-8 border-t border-border pt-5">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft aria-hidden className="size-3.5" />
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
