import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { BrandMark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { SeverityBadge, InvestigationStatusBadge } from '@/components/patterns/badges'
import { getViewerFn } from '@/server/fns/session'

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

const CONTENTS = [
  { n: '01', title: 'La méthode', note: 'Séparer les faits des hypothèses', href: '#methode' },
  { n: '02', title: 'Le cycle KQL', note: 'Votre SIEM exécute, SOCIA réinterprète', href: '#cycle' },
  { n: '03', title: 'Les modèles', note: 'Workers AI et endpoints compatibles', href: '#modeles' },
  { n: '04', title: 'La sécurité', note: 'Garde-fous et traçabilité', href: '#securite' },
]

const STEPS = [
  {
    n: '01',
    title: 'Importer l’alerte',
    body: 'Le JSON Elastic est conservé tel quel. Les champs reconnus et les absences sont affichés avant l’analyse. Vous pouvez joindre la règle, vos observations et vos recherches antérieures.',
  },
  {
    n: '02',
    title: 'Recevoir des questions',
    body: 'Chaque requête KQL est liée à une question sans réponse, avec un index cible, une plage temporelle et le signal attendu. Jamais de commande système. Jamais d’exécution.',
  },
  {
    n: '03',
    title: 'Exécuter dans le SIEM',
    body: 'Vous copiez la requête. Vous l’exécutez vous-même. SOCIA n’a ni accès réseau au SIEM, ni capacité d’exécution. Le JSON revient uniquement parce que vous l’importez.',
  },
  {
    n: '04',
    title: 'Réinterpréter, conclure',
    body: 'Les résultats sont confrontés aux hypothèses. L’analyse est mise à jour. L’analyste clôture avec un verdict, une confiance et une justification. Le rapport est versionné.',
  },
]

const GUARANTEES = [
  'Aucune connexion à Kibana ou Elasticsearch.',
  'Aucune requête KQL exécutée par SOCIA.',
  'Le JSON importé est une donnée non fiable, jamais une instruction.',
  'Un résultat vide n’est jamais une preuve d’absence d’activité.',
  'Le verdict final appartient à l’analyste.',
  'Les clés fournisseurs sont chiffrées et ne quittent jamais le serveur.',
]

function LandingPage() {
  const viewer = Route.useLoaderData()
  const cta = viewer ? '/app' : '/connexion'

  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-10 w-full max-w-page items-center justify-between gap-6 px-5 text-micro sm:px-8">
          <span className="font-mono tracking-label text-muted-foreground uppercase">No. 01 · Édition analyste · Novembre 2026</span>
          <nav className="hidden items-center gap-5 font-mono tracking-pill text-muted-foreground uppercase sm:flex">
            <a href="#methode" className="hover:text-foreground">Méthode</a>
            <a href="#cycle" className="hover:text-foreground">Cycle</a>
            <a href="#securite" className="hover:text-foreground">Sécurité</a>
          </nav>
          <div className="flex items-center gap-3">
            {!viewer && <Link to="/connexion" className="font-mono tracking-pill text-muted-foreground uppercase hover:text-foreground">Connexion</Link>}
            <Link to={cta} className="inline-flex items-center gap-1.5 font-mono tracking-pill text-brand uppercase hover:underline">
              Ouvrir SOCIA <ArrowRight aria-hidden className="size-3" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-page px-5 sm:px-8">
        <section className="border-b border-border py-8 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex items-center gap-4">
              <BrandMark className="size-10" />
              <div>
                <div className="font-display text-7xl tracking-title sm:text-masthead">SOCIA</div>
                <div className="mt-2 font-mono text-tiny tracking-masthead text-muted-foreground uppercase">SOC intelligence · Triage et investigation</div>
              </div>
            </div>
            <p className="max-w-copy font-display text-xl leading-tight text-muted-foreground sm:text-2xl">
              Le dossier d’investigation qui sépare ce qui est prouvé de ce qui est supposé.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 font-mono text-tiny tracking-label text-muted-foreground uppercase">
            <span>Le SIEM reste votre terrain</span>
            <span className="hidden sm:inline">Faits · Déductions · Hypothèses · Manques</span>
            <span>Édition 01</span>
          </div>
        </section>

        <section className="layout-front grid gap-10 border-b border-border py-12 lg:gap-0">
          <div className="min-w-0 lg:pr-8">
            <div className="font-mono text-tiny tracking-label text-brand uppercase">À la une</div>
            <h1 className="mt-4 font-display text-5xl leading-poster tracking-title text-foreground sm:text-6xl">
              Comprendre l’alerte. <em className="text-brand">Garder la main.</em>
            </h1>
            <p className="mt-6 max-w-copy font-display text-2xl leading-title text-muted-foreground">
              SOCIA aide à trier et investiguer une alerte Elastic Security ou Security Onion, sans jamais exécuter de requête à votre place.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link to={cta}>
                  <span className="inline-flex items-center gap-2">{viewer ? 'Ouvrir l’espace' : 'Ouvrir l’espace analyste'}<ArrowRight aria-hidden /></span>
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <a href="#methode">Lire la méthode</a>
              </Button>
            </div>
            <p className="mt-6 font-mono text-tiny leading-5 tracking-caps text-muted-foreground uppercase">
              Aucune connexion à Kibana. Aucune requête exécutée. Clés chiffrées.
            </p>
          </div>

          <CasePlate />

          <aside className="min-w-0 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <blockquote className="font-display text-2xl leading-tight text-foreground">
              « Je ne veux pas une IA qui conclut à ma place. Je veux une IA qui me montre ce que je n’ai pas encore regardé. »
            </blockquote>
            <p className="mt-3 font-mono text-tiny tracking-label text-muted-foreground uppercase">Analyste SOC · équipe de triage</p>

            <div className="mt-8 border-t border-border pt-4">
              <div className="font-mono text-tiny tracking-label text-muted-foreground uppercase">Sommaire</div>
              <ol className="mt-3">
                {CONTENTS.map((item) => (
                  <li key={item.n}>
                    <a href={item.href} className="flex items-baseline gap-2 border-b border-border/70 py-3 text-small hover:text-brand">
                      <span className="w-6 shrink-0 font-mono text-tiny text-brand">{item.n}</span>
                      <span className="min-w-0 flex-1">{item.title}</span>
                      <span className="font-mono text-tiny text-muted-foreground">→</span>
                    </a>
                    <p className="mb-2 pl-8 font-mono text-tiny leading-4 text-muted-foreground">{item.note}</p>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>

        <section id="methode" className="border-b border-border py-14">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-5">
            <div>
              <div className="font-mono text-tiny tracking-label text-brand uppercase">01 / La méthode</div>
              <h2 className="mt-3 max-w-hero-copy font-display text-4xl leading-poster tracking-tight sm:text-5xl">Un raisonnement lisible, pas une réponse opaque.</h2>
            </div>
            <p className="max-w-copy text-body leading-6 text-muted-foreground">Chaque analyse distingue ce qui est prouvé, ce qui est déduit, ce qui est supposé et ce qui manque.</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4">
            {[
              { n: '01', title: 'Faits observés', body: 'Ce qui est directement lisible dans l’alerte ou les résultats importés, avec sa source.', tone: 'text-fact' },
              { n: '02', title: 'Déductions', body: 'Ce que l’on peut inférer, avec le raisonnement qui relie les faits.', tone: 'text-deduction' },
              { n: '03', title: 'Hypothèses', body: 'Les explications possibles, leur statut, leur confiance et les preuves qui les soutiennent.', tone: 'text-hypothesis' },
              { n: '04', title: 'Informations manquantes', body: 'Ce qu’il faut obtenir pour trancher. Jamais comblé par une invention.', tone: 'text-unknown' },
            ].map((item, index) => (
              <article key={item.n} className={`${index > 0 ? 'border-t border-border md:border-t-0 md:border-l md:pl-6' : ''} py-6 md:py-7`}>
                <div className={`font-mono text-tiny tracking-label uppercase ${item.tone}`}>{item.n} /</div>
                <h3 className="mt-3 font-display text-2xl leading-tight">{item.title}</h3>
                <p className="mt-3 max-w-copy text-small leading-6 text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="cycle" className="layout-feature grid gap-10 border-b border-border py-14">
          <div className="min-w-0">
            <div className="font-mono text-tiny tracking-label text-brand uppercase">02 / Le cycle</div>
            <h2 className="mt-3 max-w-hero-copy font-display text-4xl leading-poster tracking-tight sm:text-5xl">Votre SIEM exécute. SOCIA réinterprète.</h2>
            <p className="mt-5 max-w-copy text-body leading-6 text-muted-foreground">
              L’IA propose des questions et des requêtes KQL Kibana en lecture seule. Vous les copiez, vous les exécutez, vous importez le JSON. Le contexte est conservé à chaque cycle.
            </p>

            <div className="mt-7 border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <span className="font-mono text-tiny tracking-label text-muted-foreground uppercase">Exhibit B · requête KQL · lecture seule</span>
                <span className="border border-brand/50 px-1.5 py-0.5 font-mono text-tiny tracking-label text-brand uppercase">Ne pas exécuter ici</span>
              </div>
              <pre className="w-full max-w-full overflow-x-auto px-4 py-5 font-mono text-meta leading-6 text-subtle">{`host.name: "WIN-FIN-042" and event.category: "process"
and process.parent.name: "winword.exe"
and process.command_line: *EncodedCommand*`}</pre>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
                <span>Index · logs-windows.powershell-*</span>
                <span>Dernières 24 heures</span>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 border-l-2 border-warning pl-3 text-meta leading-5 text-muted-foreground">
              Un résultat vide ne prouve pas l’absence d’activité. SOCIA le signale dans chaque analyse et chaque rapport.
            </p>
          </div>

          <div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            {STEPS.map((step) => (
              <article key={step.n} className="flex gap-4 border-b border-border py-5 last:border-b-0">
                <span className="font-mono text-micro tracking-pill text-brand">{step.n}</span>
                <div>
                  <h3 className="font-display text-2xl leading-tight">{step.title}</h3>
                  <p className="mt-2 text-small leading-6 text-muted-foreground">{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="modeles" className="layout-models grid gap-10 border-b border-border py-14">
          <div>
            <div className="font-mono text-tiny tracking-label text-brand uppercase">03 / Les modèles</div>
            <h2 className="mt-3 max-w-hero-copy font-display text-4xl leading-poster tracking-tight sm:text-5xl">Vos modèles, votre infrastructure.</h2>
            <p className="mt-5 max-w-copy text-body leading-6 text-muted-foreground">
              SOCIA détecte les modèles disponibles sur Workers AI et sur tout endpoint compatible OpenAI. Un administrateur peut ajouter un fournisseur distant ou un serveur Ollama exposé en HTTPS.
            </p>
          </div>
          <div className="border-t border-border">
            {[
              { label: 'Workers AI', note: 'Binding Cloudflare, catalogue détecté, aucune clé à gérer.' },
              { label: 'Compatible OpenAI', note: 'URL de base et clé chiffrée AES-GCM. Catalogue lu via /models.' },
              { label: 'Ollama distant', note: 'Tout endpoint HTTPS peut être ajouté par un administrateur.' },
              { label: 'Traçabilité', note: 'Le modèle utilisé est enregistré sur chaque analyse et chaque rapport.' },
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-3 gap-4 border-b border-border py-4">
                <span className="font-display text-xl leading-tight">{item.label}</span>
                <span className="col-span-2 text-small leading-5 text-muted-foreground">{item.note}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="securite" className="grid gap-10 border-b border-border py-14 lg:grid-cols-2">
          <div>
            <div className="font-mono text-tiny tracking-label text-brand uppercase">04 / La sécurité</div>
            <h2 className="mt-3 max-w-hero-copy font-display text-4xl leading-poster tracking-tight sm:text-5xl">Les garde-fous sont dans l’architecture.</h2>
            <p className="mt-5 max-w-copy text-body leading-6 text-muted-foreground">
              Le contenu importé est traité comme une donnée non fiable. Les instructions qu’il contient ne sont jamais suivies. Les rôles et les clés sont vérifiés côté serveur.
            </p>
            <Button asChild variant="outline" className="mt-6 h-10 px-4">
              <Link to={cta}><span className="inline-flex items-center gap-2">Ouvrir SOCIA<ArrowRight aria-hidden /></span></Link>
            </Button>
          </div>
          <div className="border-t border-border">
            {GUARANTEES.map((item, index) => (
              <div key={item} className="flex items-start gap-4 border-b border-border py-4">
                <span className="w-6 font-mono text-tiny text-brand">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-small leading-6 text-subtle">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="border-t-2 border-foreground pt-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="max-w-hero-copy font-display text-5xl leading-poster tracking-title sm:text-7xl">
                L’analyste <em className="text-brand">garde la main.</em>
              </h2>
              <div className="flex flex-col items-start gap-3">
                <Button asChild size="lg" className="h-11 px-5">
                  <Link to={cta}><span className="inline-flex items-center gap-2">Ouvrir l’espace analyste<ArrowRight aria-hidden /></span></Link>
                </Button>
                <span className="font-mono text-tiny tracking-pill text-muted-foreground uppercase">Le premier compte devient administrateur.</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-page flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <BrandMark className="size-5" />
            <span className="font-display text-xl">SOCIA</span>
          </div>
          <p className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">SOC intelligence · Triage et investigation</p>
          <div className="flex gap-4 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
            <a href="#methode" className="hover:text-foreground">Méthode</a>
            <a href="#cycle" className="hover:text-foreground">Cycle</a>
            <a href="#securite" className="hover:text-foreground">Sécurité</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function CasePlate() {
  return (
    <figure className="relative min-w-0 border border-border bg-card p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="font-mono text-tiny tracking-label text-muted-foreground uppercase">Exhibit A / alerte Elastic</span>
        <span className="border border-brand/60 px-1.5 py-0.5 font-mono text-tiny tracking-label text-brand uppercase -rotate-1">Élevée</span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity="high" />
          <InvestigationStatusBadge status="in_progress" />
          <span className="font-mono text-tiny tracking-caps text-muted-foreground uppercase">WIN-FIN-042 · a.koffi</span>
        </div>
        <h3 className="mt-3 font-display text-2xl leading-tight">Encoded PowerShell launched from an Office application</h3>
        <p className="mt-2 font-mono text-tiny leading-5 tracking-caps text-muted-foreground">2026-11-04T08:12:44Z · logs-windows.powershell-default-2026.11.04</p>
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 font-mono text-tiny tracking-label text-muted-foreground uppercase">Reconstruction</div>
          <ul className="grid gap-2">
            <li className="flex gap-2 text-meta leading-5 text-subtle">
              <span className="w-5 shrink-0 font-mono text-tiny text-fact">01</span>
              <span>Commande PowerShell encodée lancée par <span className="font-mono">winword.exe</span>.</span>
            </li>
            <li className="flex gap-2 text-meta leading-5 text-subtle">
              <span className="w-5 shrink-0 font-mono text-tiny text-deduction">02</span>
              <span>Connexion vers <span className="font-mono">185.199.108.133</span> sur le port 443.</span>
            </li>
            <li className="flex gap-2 text-meta leading-5 text-subtle">
              <span className="w-5 shrink-0 font-mono text-tiny text-hypothesis">03</span>
              <span>Document <span className="font-mono">Facture_Novembre_2026.docm</span> probablement piégé.</span>
            </li>
            <li className="flex gap-2 text-meta leading-5 text-subtle">
              <span className="w-5 shrink-0 font-mono text-tiny text-unknown">04</span>
              <span>Hash du document et expéditeur non fournis.</span>
            </li>
          </ul>
        </div>
        <div className="mt-4 min-w-0 break-words border-l-2 border-brand bg-surface-1 px-3 py-3 font-mono text-micro leading-5 text-muted-foreground">
          <span className="text-brand">KQL · </span>host.name: "WIN-FIN-042" and process.parent.name: "winword.exe"
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-mono text-tiny tracking-caps text-muted-foreground uppercase">
          <span>0 résultat affiché</span>
          <span className="text-warning">Un vide n’est pas une absence</span>
        </div>
      </div>
    </figure>
  )
}
