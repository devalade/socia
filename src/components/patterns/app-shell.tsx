import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { ChevronDown, FileSearch, LayoutDashboard, LogOut, Moon, Plus, Search, Settings, Sun } from 'lucide-react'
import { Brand } from '@/components/brand'
import { PersonAvatar } from '@/components/premium/person'
import { Truncate } from '@/components/premium/truncate'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useTheme } from '@/components/theme-provider'
import { authClient } from '@/lib/auth-client'
import { SEVERITY_LABELS } from '@/lib/alert'
import { ROLE_LABELS, type Role } from '@/lib/roles'
import { cn } from '@/lib/utils'
import type { ShellData } from '@/server/services/dashboard'

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
  info: 'bg-severity-info',
  unknown: 'bg-muted-foreground',
}

export function AppShell({ shell, children }: { shell: ShellData; children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const router = useRouter()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const isAdmin = shell.viewer.role === 'admin'

  const nav = [
    { to: '/app', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
    { to: '/app/investigations', label: 'Dossiers', icon: FileSearch, exact: false },
    ...(isAdmin ? [{ to: '/app/settings', label: 'Administration', icon: Settings, exact: false }] : []),
  ]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const value = search.trim()
    void navigate({ to: '/app/investigations', search: value ? { search: value } : {} })
    setSearch('')
  }

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    void navigate({ to: '/connexion' })
  }

  const isActive = (to: string, exact: boolean) => (exact ? pathname === to : pathname.startsWith(to))

  return (
    <SidebarProvider>
      <Sidebar data-print="hide">
        <SidebarHeader>
          <Link to="/app" aria-label="SOCIA, tableau de bord" className="flex h-11 items-center">
            <Brand />
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Espace analyste</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => {
                  const active = isActive(item.to, item.exact)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.to} aria-current={active ? 'page' : undefined}>
                          <item.icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.to === '/app/investigations' && shell.openCount > 0 && (
                        <SidebarMenuBadge className="num">{shell.openCount}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/app/investigations/new">
                      <Plus aria-hidden />
                      <span>Nouveau dossier</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Dossiers récents</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {shell.recent.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs leading-5 text-muted-foreground">Aucun dossier. Importez une alerte pour commencer.</p>
                ) : (
                  shell.recent.map((item) => {
                    const href = `/app/investigations/${item.id}`
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild isActive={pathname === href} data-audit-skip="C3">
                          <Link to="/app/investigations/$investigationId" params={{ investigationId: item.id }} title={`${SEVERITY_LABELS[item.severity]} · ${item.title}`}>
                            <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.unknown)} />
                            <Truncate>{item.title}</Truncate>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-audit-skip="C8"
                className="flex h-12 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2 text-left transition-colors duration-150 ease-out hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
                aria-label={`Compte de ${shell.viewer.name}, ${ROLE_LABELS[shell.viewer.role as Role]}`}
              >
                <PersonAvatar name={shell.viewer.name} size="md" />
                <span className="grid min-w-0 flex-1 gap-0.5 leading-none trim-cap">
                  <Truncate className="text-label font-medium trim-cap">{shell.viewer.name}</Truncate>
                  <Truncate className="text-xs text-muted-foreground trim-cap">{ROLE_LABELS[shell.viewer.role as Role]}</Truncate>
                </span>
                <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{shell.viewer.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={toggle}>
                {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
                {theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onSelect={() => void navigate({ to: '/app/settings' })}>
                  <Settings aria-hidden />
                  Administration
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut aria-hidden />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header data-print="hide" className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="md:hidden" />
          <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 sm:block sm:max-w-80">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Chercher un dossier"
                aria-label="Chercher un dossier"
                className="h-8 rounded-md border-0 bg-accent ps-8 pe-14 text-label shadow-none ring-1 ring-border ring-inset hover:not-focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <Kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">⌘K</Kbd>
            </div>
          </form>
          <div className="ms-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}>
              {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
            </Button>
          </div>
        </header>

        <main data-print="page" className="mx-auto grid w-full max-w-page min-w-0 flex-1 grid-cols-1 content-start gap-5 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
