import { createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight, FileSearch, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/patterns/page-header'
import { SectionCard } from '@/components/patterns/section-card'
import { SeverityBadge, InvestigationStatusBadge, VerdictBadge } from '@/components/patterns/badges'
import { EmptyState } from '@/components/patterns/empty-state'
import { KqlBlock } from '@/components/patterns/kql-block'
import { ConfidenceMeter } from '@/components/patterns/confidence-meter'
import { JsonViewer } from '@/components/patterns/json-viewer'
import { KpiCard } from '@/components/premium/kpi-card'
import { SEVERITIES } from '@/lib/alert'

export const Route = createFileRoute('/app/design')({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound()
  },
  component: DesignGallery,
})

function DesignGallery() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Galerie dev"
        title="Design system SOCIA"
        description="Les primitives et patterns utilisés par l’application. Cette route n’existe pas en production."
      />

      <SectionCard title="Contrôles" description="Une hauteur, des rayons concentriques, un focus visible.">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Action principale</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="outline">Contour</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="destructive">Destructif</Button>
          <Button loading>Chargement</Button>
          <Button size="icon" aria-label="Ajouter"><Plus aria-hidden /></Button>
        </div>
        <div className="mt-6 grid max-w-xl gap-4">
          <div className="grid gap-2"><Label htmlFor="demo-input">Champ</Label><Input id="demo-input" placeholder="Valeur" /></div>
          <div className="grid gap-2"><Label htmlFor="demo-textarea">Zone de texte</Label><Textarea id="demo-textarea" placeholder="Contexte de l’analyse" /></div>
        </div>
      </SectionCard>

      <SectionCard title="Badges et statuts" description="Le mot porte le sens, la couleur confirme.">
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((severity) => <SeverityBadge key={severity} severity={severity} />)}
          <InvestigationStatusBadge status="in_progress" />
          <InvestigationStatusBadge status="analyzing" />
          <InvestigationStatusBadge status="concluded" />
          <VerdictBadge verdict="confirmed_incident" />
          <VerdictBadge verdict="false_positive" />
          <Badge variant="outline">Neutre</Badge>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Métriques" description="Chiffres tabulaires et contextuels.">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard metric={{ label: 'File active', kind: 'count', value: 12, previous: 9, note: '3 de plus que la semaine dernière' }} spark={[2, 3, 5, 4, 7, 6, 9, 8, 12]} />
            <KpiCard metric={{ label: 'Confiance moyenne', kind: 'rate', value: 78, previous: 72, note: 'Sur les dossiers clôturés' }} spark={[60, 64, 70, 68, 74, 78]} />
          </div>
        </SectionCard>
        <SectionCard title="États" description="Vide, chargement, erreur.">
          <div className="grid gap-3">
            <EmptyState icon={<FileSearch aria-hidden />} title="Aucune investigation" description="Importez une alerte pour commencer." action={<Button size="sm"><Sparkles aria-hidden />Commencer</Button>} />
            <div className="grid gap-2"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Requête KQL" description="Toujours copiable, jamais exécutée.">
          <KqlBlock kql={'event.category:process and host.name:"WIN-FIN-042"\n| keep @timestamp, user.name, process.command_line'} index="logs-windows.*" range="Dernières 24 heures" />
        </SectionCard>
        <SectionCard title="Confiance et JSON" description="Une preuve lisible, échappée par React.">
          <ConfidenceMeter value={72} />
          <div className="mt-4"><JsonViewer value={JSON.stringify({ rule: { name: 'Demo' }, hits: { total: { value: 0 } } }, null, 2)} maxHeight="10rem" /></div>
        </SectionCard>
      </div>

      <Card className="flex flex-row items-center justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-medium">Composition typographique</div>
          <p className="mt-1 text-sm text-muted-foreground">Geist pour l’interface, Geist Mono pour les preuves et les requêtes.</p>
        </div>
        <Button asChild variant="outline" size="sm"><a href="#top">Retour<ArrowRight aria-hidden /></a></Button>
      </Card>
    </div>
  )
}
