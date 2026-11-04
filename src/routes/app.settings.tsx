import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/premium/status-badge'
import { Truncate } from '@/components/premium/truncate'
import { PageHeader } from '@/components/patterns/page-header'
import { SectionCard } from '@/components/patterns/section-card'
import { PageSkeleton } from '@/components/patterns/route-states'
import { EmptyState } from '@/components/patterns/empty-state'
import { getAdminProvidersFn, createOpenAiProviderFn, deleteProviderFn, refreshModelsFn, setProviderActiveFn, testModelFn } from '@/server/fns/providers'
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
  { id: 'ia', label: 'Modèles IA', icon: Sparkles },
  { id: 'equipe', label: 'Équipe', icon: Users },
  { id: 'audit', label: 'Journal d’audit', icon: Activity },
  { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
] as const

function SettingsPage() {
  const { providerData, team, audit } = Route.useLoaderData()
  const activeProviders = providerData.providers.filter((provider) => provider.isActive).length
  const activeModels = providerData.models.filter((model) => model.isActive).length
  const filters = Route.useSearch()
  const router = useRouter()
  const navigate = Route.useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [auditTerm, setAuditTerm] = useState(filters.auditSearch ?? '')
  const tab = filters.tab ?? 'ia'

  function setTab(next: (typeof TABS)[number]['id']) {
    void navigate({ search: (previous) => ({ ...previous, tab: next }) })
  }

  async function refresh(providerId?: string) {
    setBusy(`refresh-${providerId ?? 'all'}`)
    try {
      await refreshModelsFn({ data: { providerId } })
      toast.success('Détection terminée')
      await router.invalidate()
    } catch (error) {
      toast.error('Détection impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  async function toggleProvider(providerId: string, active: boolean) {
    setBusy(`toggle-${providerId}`)
    try {
      await setProviderActiveFn({ data: { providerId, active } })
      toast.success(active ? 'Fournisseur activé' : 'Fournisseur désactivé')
      await router.invalidate()
    } catch (error) {
      toast.error('Mise à jour impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  async function test(providerId: string, modelId: string) {
    setBusy(`test-${providerId}-${modelId}`)
    try {
      const result = await testModelFn({ data: { providerId, modelId } })
      toast.success('Test réussi', { description: result.detail || 'Le modèle a répondu.' })
    } catch (error) {
      toast.error('Test échoué', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(null)
    }
  }

  async function removeProvider() {
    if (!deleteTarget) return
    setBusy('delete')
    try {
      await deleteProviderFn({ data: { providerId: deleteTarget } })
      toast.success('Fournisseur supprimé')
      setDeleteTarget(null)
      await router.invalidate()
    } catch (error) {
      toast.error('Suppression impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
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
        actions={<Button size="sm" variant="outline" onClick={() => void refresh()} loading={busy === 'refresh-all'}><RefreshCw aria-hidden />Détecter tous les modèles</Button>}
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
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            {providerData.providers.map((provider) => (
              <div key={provider.id} className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                      {provider.kind === 'workers-ai' ? <Cpu aria-hidden className="size-4" /> : <Server aria-hidden className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words text-sm font-medium">{provider.name}</h3>
                        <StatusBadge tone={!provider.isActive ? 'neutral' : provider.lastError ? 'warning' : 'success'}>
                          {!provider.isActive ? 'Inactif' : provider.lastError ? 'Erreur' : 'Actif'}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {provider.kind === 'workers-ai' ? 'Binding Workers AI du compte Cloudflare' : provider.baseUrl}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {provider.modelCount} modèle{provider.modelCount > 1 ? 's' : ''} · {provider.lastCheckedAt ? <>vérifié <RelativeTime value={provider.lastCheckedAt} /></> : 'jamais vérifié'}
                        {provider.keyHint && ` · clé ••••${provider.keyHint}`}
                      </p>
                    </div>
                  </div>
                  {provider.kind !== 'workers-ai' && (
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={provider.isActive}
                        onCheckedChange={(value) => void toggleProvider(provider.id, value)}
                        disabled={busy === `toggle-${provider.id}`}
                        aria-label={provider.isActive ? 'Désactiver le fournisseur' : 'Activer le fournisseur'}
                      />
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(provider.id)} aria-label="Supprimer le fournisseur">
                        <Trash2 aria-hidden className="text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                {provider.lastError && (
                  <p className="mt-3 rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-xs leading-5 text-warning">{provider.lastError}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => void refresh(provider.id)} loading={busy === `refresh-${provider.id}`} disabled={busy !== null}>
                    <RefreshCw aria-hidden />
                    Détecter les modèles
                  </Button>
                  {provider.kind === 'openai-compatible' && (
                    <span className="text-xs text-muted-foreground">Clé chiffrée AES-GCM. Jamais renvoyée au navigateur.</span>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex min-h-36 min-w-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-1/30 px-4 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-foreground"
            >
              <Plus aria-hidden className="size-4" />
              Ajouter un fournisseur compatible OpenAI
            </button>
          </div>

          <SectionCard title="Catalogue des modèles" description="Les modèles détectés sont sélectionnables lors de la création d’une investigation. Testez un modèle avant de l’utiliser en production." flush>
            {providerData.models.length === 0 ? (
              <EmptyState icon={<Sparkles aria-hidden />} title="Aucun modèle détecté" description="Lancez la détection sur le fournisseur Workers AI pour charger le catalogue." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-table-x border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-xs text-muted-foreground">
                      <th className="px-5 py-2 font-medium">Modèle</th>
                      <th className="px-3 py-2 font-medium">Fournisseur</th>
                      <th className="px-3 py-2 font-medium">Recommandé</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      <th className="px-5 py-2 text-right font-medium">Vérification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {providerData.models.map((model) => (
                      <tr key={model.id} className="hover:bg-accent/20">
                        <td className="max-w-search px-5 py-3">
                          <Truncate className="font-medium">{model.label}</Truncate>
                          <Truncate className="mt-0.5 font-mono text-xs text-muted-foreground">{model.modelId}</Truncate>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{model.providerName}</td>
                        <td className="px-3 py-3">{model.isRecommended ? <StatusBadge tone="info">Conseillé</StatusBadge> : <span className="text-muted-foreground">n/d</span>}</td>
                        <td className="px-3 py-3"><StatusBadge tone={model.isActive ? 'success' : 'neutral'}>{model.isActive ? 'Actif' : 'Inactif'}</StatusBadge></td>
                        <td className="px-5 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => void test(model.providerId, model.modelId)} loading={busy === `test-${model.providerId}-${model.modelId}`} disabled={busy !== null}>
                            Tester
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      <AddProviderDialog open={addOpen} onOpenChange={setAddOpen} />
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce fournisseur ?</DialogTitle>
            <DialogDescription>Les modèles associés seront retirés du catalogue. Les investigations existantes conservent le nom du modèle utilisé.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={busy === 'delete'}>Annuler</Button>
            <Button variant="destructive" onClick={() => void removeProvider()} loading={busy === 'delete'}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddProviderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const result = await createOpenAiProviderFn({ data: { name: name.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() } })
      if (result.detectionError) {
        toast.warning('Fournisseur enregistré, détection incomplète', { description: result.detectionError })
      } else {
        toast.success('Fournisseur ajouté et modèles détectés')
      }
      setName('')
      setApiKey('')
      onOpenChange(false)
      await router.invalidate()
    } catch (error) {
      toast.error('Ajout impossible', { description: error instanceof Error ? error.message : 'Erreur inconnue.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un fournisseur compatible OpenAI</DialogTitle>
          <DialogDescription>L’URL doit exposer /models et /chat/completions. La clé est chiffrée avant d’être enregistrée.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="provider-name">Nom</Label>
            <Input id="provider-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ollama interne, OpenAI, Azure…" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-url">URL de base</Label>
            <Input id="provider-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.exemple.tld/v1" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-key">Clé API</Label>
            <Input id="provider-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" placeholder="sk-…" />
          </div>
          <p className="flex items-start gap-2 rounded-md border border-border bg-surface-1 px-3 py-2 text-xs leading-5 text-muted-foreground">
            <KeyRound aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand" />
            Chiffrement AES-GCM au repos. La clé n’est jamais renvoyée au client, jamais journalisée, et les erreurs du fournisseur sont expurgées.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={() => void submit()} loading={busy} disabled={name.trim().length < 2 || !baseUrl.trim() || apiKey.trim().length < 8}>Ajouter et détecter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
