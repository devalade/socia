import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import {
  Activity,
  CheckCircle2,
  Database,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/premium/status-badge'
import { PageHeader } from '@/components/patterns/page-header'
import { SectionCard } from '@/components/patterns/section-card'
import { PageSkeleton } from '@/components/patterns/route-states'
import { EmptyState } from '@/components/patterns/empty-state'
import { getAdminProvidersFn, testModelFn } from '@/server/fns/providers'
import { getTeamFn, updateMemberRoleFn } from '@/server/fns/team'
import { getAuditFn } from '@/server/fns/audit'
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, type Role } from '@/lib/roles'
import { dateTime } from '@/lib/dates'
import { RelativeTime } from '@/components/patterns/relative-time'

const search = z.object({
  tab: z.enum(['ia', 'equipe', 'audit', 'securite']).optional(),
  auditSearch: z.string().optional(),
  auditPage: z.coerce.number().int().min(1).optional(),
})

export const Route = createFileRoute('/app/settings')({
  validateSearch: search,
  beforeLoad: ({ context }) => {
    if (context.viewer.role !== 'admin') throw redirect({ to: '/app' })
  },
  loaderDeps: ({ search: filters }) => filters,
  loader: async ({ deps }) => {
    const [providerData, team, audit] = await Promise.all([
      getAdminProvidersFn(),
      getTeamFn(),
      getAuditFn({ data: { search: deps.auditSearch, page: deps.auditPage ?? 1, pageSize: 30 } }),
    ])
    return { providerData, team, audit }
  },
  pendingComponent: () => <PageSkeleton rows={4} />,
  component: SettingsPage,
})

const TABS = [
  { id: 'ia', label: 'Modèle IA', icon: Sparkles },
  { id: 'equipe', label: 'Équipe', icon: Users },
  { id: 'audit', label: 'Journal d’audit', icon: Activity },
  { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
] as const

function SettingsPage() {
  const { providerData, team, audit } = Route.useLoaderData()
  const activeProviders = providerData.providers.filter((provider) => provider.isActive).length
  const model = providerData.model
  const provider = providerData.providers.find((item) => item.id === model.providerId)
  const activeModels = 1
  const filters = Route.useSearch()
  const router = useRouter()
  const navigate = Route.useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [auditTerm, setAuditTerm] = useState(filters.auditSearch ?? '')
  const tab = filters.tab ?? 'ia'

  function setTab(next: (typeof TABS)[number]['id']) {
    void navigate({ search: (previous) => ({ ...previous, tab: next }) })
  }

  async function testPinnedModel() {
    setBusy('test')
    try {
      const result = await testModelFn({ data: { providerId: model.providerId, modelId: model.modelId } })
      toast.success('Test réussi', { description: result.detail || 'Le modèle a répondu.' })
    } catch (error) {
      toast.error('Test échoué', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  async function changeRole(userId: string, role: Role) {
    setBusy(`role-${userId}`)
    try {
      await updateMemberRoleFn({ data: { userId, role } })
      toast.success('Rôle mis à jour')
      await router.invalidate()
    } catch (error) {
      toast.error('Changement impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Administration"
        description="L’espace d’administration contrôle les fournisseurs d’IA, les rôles et le journal d’audit. Il est réservé aux administrateurs et chaque action y est enregistrée."
        meta={
          <>
            <span>{activeProviders} fournisseur{activeProviders > 1 ? 's' : ''} actif{activeProviders > 1 ? 's' : ''}</span>
            <span>{activeModels} modèle{activeModels > 1 ? 's' : ''} actif{activeModels > 1 ? 's' : ''}</span>
            <span>{team.length} membre{team.length > 1 ? 's' : ''}</span>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as (typeof TABS)[number]['id'])}>
        <TabsList className="h-9 w-full justify-start overflow-x-auto p-1">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="shrink-0 gap-1.5 px-3 text-xs">
              <item.icon aria-hidden className="size-3.5" />
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'ia' && (
        <div className="grid min-w-0 grid-cols-1 gap-5">
          <SectionCard title="Modèle d’analyse" description="Le modèle utilisé pour chaque analyse. Il est fixé pour garder des résultats comparables.">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Sparkles aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{model.label}</div>
                  <div className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{model.modelId}</div>
                </div>
              </div>
              <StatusBadge tone="success">Actif</StatusBadge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => void testPinnedModel()} loading={busy === 'test'} disabled={busy !== null}>
                <Sparkles aria-hidden />
                Tester le modèle
              </Button>
              <span className="text-xs text-muted-foreground">Un seul modèle pour toutes les analyses, sans catalogue à parcourir.</span>
            </div>
          </SectionCard>

          <SectionCard title="Fournisseur" description="Le binding Workers AI du compte Cloudflare fournit ce modèle.">
            {provider ? (
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Sparkles aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-sm font-medium text-foreground">{provider.name}</h3>
                    <StatusBadge tone={!provider.isActive ? 'neutral' : provider.lastError ? 'warning' : 'success'}>
                      {!provider.isActive ? 'Inactif' : provider.lastError ? 'Erreur' : 'Actif'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 break-words text-xs text-muted-foreground">Binding Workers AI du compte Cloudflare</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {provider.lastCheckedAt ? <>Vérifié <RelativeTime value={provider.lastCheckedAt} /></> : 'Non vérifié'}
                  </p>
                  {provider.lastError && <p className="mt-2 rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-xs leading-5 text-warning">{provider.lastError}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Fournisseur introuvable.</p>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'equipe' && (
        <SectionCard title="Membres de l’espace" description="Les rôles sont vérifiés côté serveur à chaque action. Les boutons masqués ne sont jamais la seule protection." flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-table-wide border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Membre</th>
                  <th className="px-3 py-2 font-medium">Fonction</th>
                  <th className="px-3 py-2 font-medium">Rôle</th>
                  <th className="px-5 py-2 text-right font-medium">Depuis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {team.map((member) => (
                  <tr key={member.userId} className="hover:bg-accent/20">
                    <td className="px-5 py-3">
                      <div className="font-medium">{member.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{member.email}</div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{member.title}</td>
                    <td className="px-3 py-3">
                      <Select value={member.role} onValueChange={(value) => void changeRole(member.userId, value as Role)} disabled={busy === `role-${member.userId}`}>
                        <SelectTrigger className="h-9 w-40" aria-label={`Rôle de ${member.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 max-w-56 text-xs leading-4 text-muted-foreground">{ROLE_DESCRIPTIONS[member.role]}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{dateTime(member.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === 'audit' && (
        <SectionCard
          title="Journal d’audit"
          description="Chaque action sensible est horodatée. Les contenus d’alerte et les clés ne sont jamais écrits dans ce journal."
          action={
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void navigate({ search: (previous) => ({ ...previous, tab: 'audit', auditSearch: auditTerm.trim() || undefined, auditPage: 1 }) })
              }}
              className="flex flex-wrap items-center gap-2 max-sm:w-full"
            >
              <Label htmlFor="audit-search" className="text-xs font-normal text-muted-foreground">Rechercher</Label>
              <Input id="audit-search" value={auditTerm} onChange={(event) => setAuditTerm(event.target.value)} placeholder="Action, e-mail, identifiant" className="h-11 min-w-0 flex-1 sm:h-9 sm:w-56 sm:flex-none" />
              <Button type="submit" size="sm" variant="outline" className="h-11 sm:h-9">Filtrer</Button>
            </form>
          }
          flush
        >
          {audit.rows.length === 0 ? (
            <EmptyState icon={<Activity aria-hidden />} title="Aucune entrée" description="Le journal enregistre les créations, analyses, imports, exports, changements de rôle et actions sur les fournisseurs." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-table-x border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-xs text-muted-foreground">
                      <th className="px-5 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Acteur</th>
                      <th className="px-3 py-2 font-medium">Cible</th>
                      <th className="px-3 py-2 font-medium">IP</th>
                      <th className="px-5 py-2 text-right font-medium">Horodatage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {audit.rows.map((row) => (
                      <tr key={row.id} className="align-top hover:bg-accent/20">
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs text-subtle">{row.action}</span>
                          {Object.keys(row.metadata).length > 0 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Détails</summary>
                              <pre className="mt-1 max-w-form overflow-auto rounded border border-border bg-surface-1 p-2 font-mono text-xs text-muted-foreground">{JSON.stringify(row.metadata, null, 2)}</pre>
                            </details>
                          )}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{row.actorEmail || 'Système'}</td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.entityType}{row.entityId ? ` · ${row.entityId}` : ''}</td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{row.ip || 'n/d'}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{dateTime(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
                <span>{audit.total} entrée{audit.total > 1 ? 's' : ''} · page {audit.page}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={audit.page <= 1} onClick={() => void navigate({ search: (previous) => ({ ...previous, tab: 'audit', auditPage: audit.page - 1 }) })}>Précédent</Button>
                  <Button size="sm" variant="outline" disabled={audit.page * audit.pageSize >= audit.total} onClick={() => void navigate({ search: (previous) => ({ ...previous, tab: 'audit', auditPage: audit.page + 1 }) })}>Suivant</Button>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      )}

      {tab === 'securite' && <SecurityTab />}


    </div>
  )
}

function SecurityTab() {
  const items = [
    {
      icon: LockKeyhole,
      title: 'Authentification et sessions',
      points: ['Mots de passe hachés par Better Auth, jamais lus par l’application.', 'Cookies HttpOnly, SameSite Lax, Secure en production.', 'Sessions révoquées vérifiées à chaque requête, sans cache cookie.', 'Limitation de débit sur la connexion et l’inscription.'],
    },
    {
      icon: Users,
      title: 'Rôles vérifiés côté serveur',
      points: ['Administrateur, analyste et lecteur.', 'Chaque mutation appelle requireActor puis vérifie le rôle.', 'Un analyste ne modifie que ses investigations, un lecteur ne modifie rien.', 'Le dernier administrateur ne peut pas être retrogradé.'],
    },
    {
      icon: KeyRound,
      title: 'Clés de fournisseurs',
      points: ['Chiffrement AES-GCM avec une clé dérivée côté serveur.', 'Aucune clé dans le bundle client, les logs ou le journal d’audit.', 'Expurgation des messages d’erreur fournisseur.', 'Validation d’URL pour bloquer les adresses privées et les métadonnées cloud.'],
    },
    {
      icon: ShieldCheck,
      title: 'Contenu non fiable',
      points: ['Chaque bloc de données est délimité par un nonce unique.', 'Les tentatives d’instruction sont signalées mais restent traitées comme données.', 'Le rendu React échappe tout le contenu importé.', 'Aucune exécution de KQL, de shell ou de commande système.'],
    },
    {
      icon: Database,
      title: 'Conservation et reprise',
      points: ['Alerte originale stockée sans modification.', 'Analyses, hypothèses, requêtes et résultats versionnés.', 'Une investigation interrompue reprend avec son contexte complet.', 'Les rapports sont versionnés et exportables.'],
    },
    {
      icon: Activity,
      title: 'Journal d’audit',
      points: ['Création, analyse, import, clôture, export et administration.', 'Aucun contenu d’alerte ni secret dans les métadonnées.', 'Horodatage UTC, acteur, cible et adresse IP.', 'Consultable uniquement par les administrateurs.'],
    },
  ]
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand"><item.icon aria-hidden className="size-4" /></span>
            <h3 className="text-sm font-medium">{item.title}</h3>
          </div>
          <ul className="mt-4 grid gap-2">
            {item.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-warning/10 text-warning"><XCircle aria-hidden className="size-4" /></span>
          <h3 className="text-sm font-medium">Ce que SOCIA ne fait pas, par conception</h3>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
          <p>Il ne se connecte ni à Kibana ni à Elasticsearch. Aucune requête KQL n’est exécutée par le serveur.</p>
          <p>Il ne reçoit pas de résultat sans un import explicite de l’analyste. Un résultat vide n’est jamais une preuve d’absence.</p>
          <p>Il ne présente pas une sortie de modèle comme une conclusion. Le verdict reste une décision humaine.</p>
          <p>Il ne stocke aucune clé API en clair et ne l’expose jamais dans le HTML ou les réponses réseau.</p>
        </div>
      </div>
    </div>
  )
}
