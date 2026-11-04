import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/patterns/app-shell'
import { PageSkeleton } from '@/components/patterns/route-states'
import { getShellDataFn } from '@/server/fns/dashboard'
import { getViewerFn } from '@/server/fns/session'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ location }) => {
    const viewer = await getViewerFn()
    if (!viewer) {
      throw redirect({ to: '/connexion', search: { redirect: location.href === '/app' ? undefined : location.href } })
    }
    return { viewer }
  },
  loader: () => getShellDataFn(),
  pendingComponent: () => <PageSkeleton />,
  component: AppLayout,
})

function AppLayout() {
  const shell = Route.useLoaderData()
  return (
    <AppShell shell={shell}>
      <Outlet />
    </AppShell>
  )
}
