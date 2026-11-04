import { useRouter } from '@tanstack/react-router'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function RouteError({ error }: { error: Error }) {
  const router = useRouter()
  return (
    <Card className="mx-auto mt-10 max-w-lg gap-4 rounded-xl border-border p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
          <CircleAlert aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Cette vue n’a pas pu se charger</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {error.message || 'Une erreur inattendue est survenue. Vos données enregistrées ne sont pas perdues.'}
          </p>
        </div>
      </div>
      <div>
        <Button variant="secondary" onClick={() => router.invalidate()}>
          <RefreshCw aria-hidden />
          Réessayer
        </Button>
      </div>
    </Card>
  )
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Chargement">
      <div className="grid gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-105 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 layout-main-rail">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  )
}
