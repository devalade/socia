import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, FileJson, GitBranch, Lightbulb, LockKeyhole, ScanText, ShieldCheck, TerminalSquare, TriangleAlert } from 'lucide-react'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/premium/status-badge'
import { KqlBlock } from '@/components/patterns/kql-block'
import { getViewerFn } from '@/server/fns/session'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  loader: () => getViewerFn(),
  head: () => ({
    meta: [
      { title: 'SOCIA · L’analyste garde la main' },
      {
        name: 'description',
        content:
          'SOCIA structure le triage et l’investigation des alertes Elastic Security et Security Onion. Faits, déductions, hypothèses et manques, sans jamais exécuter de requête à votre place.',
      },
    ],
  }),
  component: LandingPage,
})

const METHOD = [
  {
    icon: CheckCircle2,
    title: 'Faits observés',
    body: 'Ce qui est directement lisible dans l’alerte ou les résultats importés, avec sa source.',
    tone: 'text-fact',
    bg: 'bg-fact/10',
  },
  {
    icon: GitBranch,
    title: 'Déductions',
    body: 'Ce que l’on peut inférer, avec le raisonnement qui relie les faits.',
    tone: 'text-deduction',
    bg: 'bg-deduction/10',
  },
  {
    icon: Lightbulb,
    title: 'Hypothèses',
    body: 'Les explications possibles, leur statut, leur confiance et les preuves qui les soutiennent.',
    tone: 'text-hypothesis',
    bg: 'bg-hypothesis/10',
  },
  {
    icon: ScanText,
    title: 'Informations manquantes',
    body: 'Ce qu’il faut obtenir pour trancher. Jamais comblé par une invention.',
    tone: 'text-unknown',
    bg: 'bg-unknown/10',
  },
]

const STEPS = [
  { title: 'Importer l’alerte', body: 'Le JSON Elastic est conservé tel quel. Les champs reconnus et les absences sont affichés avant l’analyse.' },
  { title: 'Exécuter dans le SIEM', body: 'SOCIA propose une requête KQL justifiée. Vous la copiez, vous l’exécutez, vous importez le JSON.' },
  { title: 'Réinterpréter, conclure', body: 'Les résultats sont confrontés aux hypothèses. Vous clôturez avec un verdict, une confiance et une justification.' },
]

const GUARANTEES = [
  'Aucune connexion à Kibana ou Elasticsearch.',
  'Aucune requête KQL exécutée par SOCIA.',
  'Le JSON importé reste une donnée non fiable, jamais une instruction.',
  'Un résultat vide n’est jamais une preuve d’absence d’activité.',
  'Le verdict final appartient à l’analyste.',
  'Les clés fournisseurs sont chiffrées et ne quittent jamais le serveur.',
]

const TRUST = [
  { icon: TerminalSquare, title: 'Requêtes KQL', body: 'Proposées, justifiées, copiables. Jamais exécutées.', label: 'Lecture seule', tone: 'info' as const },
  { icon: FileJson, title: 'Résultats importés', body: 'Vous seul importez le JSON renvoyé par votre SIEM.', label: 'Import explicite', tone: 'success' as const },
  { icon: LockKeyhole, title: 'Clés fournisseurs', body: 'Chiffrées AES-GCM, jamais renvoyées au client.', label: 'Chiffrées', tone: 'success' as const },
  { icon: ShieldCheck, title: 'Verdict', body: 'Une décision humaine, justifiée par les preuves.', label: 'Humain', tone: 'warning' as const },
]

const SAMPLE_KQL = `host.name: "WIN-FIN-042" and event.category: "process"
and process.parent.name: "winword.exe"
and process.command_line: *EncodedCommand*`

function LandingPage() {
  const viewer = Route.useLoaderData()
  const cta = viewer ? '/app' : '/connexion'

  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-6 px-5 sm:px-8">
          <Link to="/" aria-label="SOCIA, accueil">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#methode" className="transition-colors hover:text-foreground">Méthode</a>
            <a href="#cycle" className="transition-colors hover:text-foreground">Cycle</a>
            <a href="#securite" className="transition-colors hover:text-foreground">Sécurité</a>
          </nav>
          <div className="flex items-center gap-2">
            {!viewer && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/connexion">Connexion</Link>
              </Button>
            )}
            <Button asChild size="sm" className="max-sm:h-11 max-sm:ps-4! max-sm:pe-4!">
              <Link to={cta}>
                {viewer ? 'Ouvrir l’espace' : 'Ouvrir SOCIA'}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div aria-hidden className="pointer-events-none absolute inset-0 hero-field" />
          <div className="relative mx-auto grid max-w-page gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-5 lg:items-center lg:pb-24 lg:pt-24">
            <div className="min-w-0 lg:col-span-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-brand" />
                Triage et investigation SOC
              </div>
              <h1 className="optical-043 mt-6 max-w-3xl text-4xl leading-display font-semibold tracking-display text-foreground sm:text-5xl lg:text-6xl">
                Comprendre l’alerte.
                <br />
                <span className="text-brand">Garder la main.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                SOCIA structure le raisonnement de l’analyste, sépare les faits des hypothèses et garde chaque preuve traçable. Votre SIEM reste le seul à exécuter les requêtes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-11 px-5">
                  <Link to={cta}>
                    Ouvrir l’espace analyste
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 px-5">
                  <a href="#methode">Voir la méthode</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2"><LockKeyhole aria-hidden className="size-3.5 text-brand" />Clés chiffrées AES-GCM</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden className="size-3.5 text-info" />Verdict humain</span>
              </div>
            </div>

            <div className="relative min-w-0 lg:col-span-3">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="flex h-9 items-center gap-2 border-b border-border px-4">
                  <span className="size-2 rounded-full bg-muted-foreground/30" />
                  <span className="size-2 rounded-full bg-muted-foreground/20" />
                  <span className="size-2 rounded-full bg-muted-foreground/10" />
                  <span className="ms-3 font-mono text-tiny text-muted-foreground">socia.devalade.me/app</span>
                </div>
                <img
                  src="/landing-dashboard.png"
                  alt="Tableau de bord SOCIA : briefing de posture, file de triage et signaux de la chaîne d’analyse."
                  className="w-full"
                  width={1440}
                  height={900}
                  fetchPriority="high"
                />
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-background to-transparent dark:block" />
            </div>
          </div>
        </section>

        <section id="methode" className="border-b border-border">
          <div className="mx-auto max-w-page px-5 py-16 sm:px-8 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-brand">La méthode</div>
                <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-display text-foreground sm:text-3xl">Un raisonnement lisible, pas une réponse opaque.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">Chaque analyse distingue ce qui est prouvé, ce qui est déduit, ce qui est supposé et ce qui manque.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {METHOD.map((item) => (
                <Card key={item.title} className="gap-3 p-5">
                  <span className={cn('grid size-9 place-items-center rounded-lg', item.bg, item.tone)}>
                    <item.icon aria-hidden className="size-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="cycle" className="border-b border-border">
          <div className="mx-auto grid max-w-page gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-20">
            <div className="min-w-0">
              <div className="text-xs font-medium text-brand">Le cycle</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-display text-foreground sm:text-3xl">Votre SIEM exécute. SOCIA réinterprète.</h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
                L’IA propose des questions et des requêtes KQL en lecture seule. Vous les copiez, vous les exécutez, vous importez le JSON. Le contexte est conservé à chaque cycle.
              </p>
              <div className="mt-7 grid gap-4">
                {STEPS.map((step, index) => (
                  <div key={step.title} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card text-xs font-medium text-brand num">{index + 1}</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{step.title}</div>
                      <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="min-w-0 gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Requête proposée</div>
                  <div className="text-xs text-muted-foreground">Question sans réponse · lecture seule</div>
                </div>
                <StatusBadge tone="info">À exécuter</StatusBadge>
              </div>
              <KqlBlock kql={SAMPLE_KQL} index="logs-windows.powershell-*" range="Dernières 24 heures" />
              <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/8 p-3 text-xs leading-5 text-warning">
                <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                Le résultat n’est jamais simulé. Vous l’importez après l’avoir obtenu dans votre SIEM.
              </div>
            </Card>
          </div>
        </section>

        <section id="securite" className="border-b border-border">
          <div className="mx-auto grid max-w-page gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-start lg:py-20">
            <div>
              <div className="text-xs font-medium text-brand">Sécurité</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-display text-foreground sm:text-3xl">Les garde-fous sont dans l’architecture.</h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
                SOCIA ne se connecte pas à votre SIEM, n’exécute aucune requête et ne reçoit que les résultats que vous importez.
              </p>
              <div className="mt-6 grid gap-3">
                {GUARANTEES.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <Card className="gap-0 overflow-hidden p-0">
              <div className="border-b border-border p-5">
                <div className="text-sm font-semibold text-foreground">Périmètre de confiance</div>
                <div className="mt-1 text-xs text-muted-foreground">Ce que SOCIA peut et ne peut pas faire.</div>
              </div>
              <div className="divide-y divide-border">
                {TRUST.map((row) => (
                  <div key={row.title} className="flex items-start justify-between gap-4 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-1 text-muted-foreground">
                        <row.icon aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{row.title}</div>
                        <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{row.body}</div>
                      </div>
                    </div>
                    <StatusBadge tone={row.tone}>{row.label}</StatusBadge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-page px-5 py-16 sm:px-8 lg:py-20">
            <Card className="flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <h2 className="text-xl font-semibold tracking-title text-foreground">Ouvrez votre premier dossier.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Importez une alerte. SOCIA s’occupe du raisonnement, vous gardez la décision.</p>
              </div>
              <Button asChild size="lg" className="h-11 px-5">
                <Link to={cta}>
                  Ouvrir l’espace analyste
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-page flex-col gap-3 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Brand size="sm" />
          <div className="flex flex-wrap gap-4">
            <a href="#methode" className="hover:text-foreground">Méthode</a>
            <a href="#cycle" className="hover:text-foreground">Cycle</a>
            <a href="#securite" className="hover:text-foreground">Sécurité</a>
            <Link to="/connexion" className="hover:text-foreground">Connexion</Link>
          </div>
          <span>© 2026 SOCIA.</span>
        </div>
      </footer>
    </div>
  )
}
