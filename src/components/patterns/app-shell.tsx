import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { FileSearch, LayoutDashboard, LogOut, Menu, Moon, Plus, Search, Settings, ShieldCheck, Sun } from 'lucide-react'
import { BrandMark } from '@/components/brand'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useTheme } from '@/components/theme-provider'
import { authClient } from '@/lib/auth-client'
import { initials } from '@/lib/format'
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
  const [mobileOpen, setMobileOpen] = useState(false)
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

  useEffect(() => setMobileOpen(false), [pathname])

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

  const mobileNav = (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="grid leading-none">
            <span className="font-display text-2xl tracking-tight">SOCIA</span>
            <span className="mt-1 font-mono text-tiny tracking-wider text-muted-foreground uppercase">SOC intelligence</span>
          </div>
        </div>
      </div>
      <nav aria-label="Navigation principale" className="grid gap-0 border-b border-border px-3 py-4">
        {nav.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-3 border-b border-border/60 px-2 py-3 text-sm last:border-0',
              isActive(item.to, item.exact) ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span className="font-mono text-micro text-brand">{String(index + 1).padStart(2, '0')}</span>
            <item.icon aria-hidden className="size-4" />
            {item.label}
          </Link>
        ))}
        <Link to="/app/investigations/new" className="flex items-center gap-3 px-2 py-3 text-sm text-brand">
          <span className="font-mono text-micro">+</span>
          Nouveau dossier
        </Link>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-3 font-mono text-tiny tracking-wide text-muted-foreground uppercase">Dossiers récents</div>
        <div className="grid gap-0">
          {shell.recent.length === 0 && <p className="text-xs leading-5 text-muted-foreground">Aucun dossier. Importez une alerte pour ouvrir le premier.</p>}
          {shell.recent.map((item) => (
            <Link key={item.id} to="/app/investigations/$investigationId" params={{ investigationId: item.id }} className="flex items-center gap-3 border-b border-border/60 py-3 text-xs text-muted-foreground last:border-0">
              <span className={cn('size-1.5 shrink-0 rounded-full', SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.unknown)} />
              <span className="line-clamp-1">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-8 rounded-sm">
            <AvatarFallback className="rounded-sm bg-brand text-meta font-semibold text-brand-foreground">{initials(shell.viewer.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{shell.viewer.name}</div>
            <div className="text-micro text-muted-foreground">{ROLE_LABELS[shell.viewer.role as Role]}</div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}>
            {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => void signOut()} aria-label="Se déconnecter"><LogOut aria-hidden /></Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-background">
      <header data-print="hide" className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-shell items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Ouvrir la navigation"><Menu aria-hidden /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-75 border-border bg-background p-0">
              <SheetTitle className="sr-only">Navigation SOCIA</SheetTitle>
              {mobileNav}
            </SheetContent>
          </Sheet>

          <Link to="/app" className="flex shrink-0 items-center gap-2.5" aria-label="SOCIA, tableau de bord">
            <BrandMark className="size-8" />
            <span className="grid leading-none">
              <span className="font-display text-title leading-none tracking-tight">SOCIA</span>
              <span className="mt-1 hidden font-mono text-tiny tracking-wider text-muted-foreground uppercase sm:block">SOC intelligence</span>
            </span>
          </Link>

          <nav aria-label="Navigation principale" className="ms-4 hidden h-16 items-stretch md:flex">
            {nav.map((item, index) => {
              const active = isActive(item.to, item.exact)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'relative flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
                    active && 'text-foreground',
                  )}
                >
                  <span className={cn('font-mono text-tiny tracking-caps', active ? 'text-brand' : 'text-muted-foreground/50')}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                  {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-px bg-brand" />}
                </Link>
              )
            })}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <form onSubmit={submitSearch} className="hidden shrink-0 items-center gap-2 lg:flex">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-0 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Chercher un dossier"
                  aria-label="Chercher un dossier"
                  className="h-9 w-56 rounded-none border-0 border-b border-border bg-transparent pl-5 font-mono text-meta shadow-none focus-visible:border-brand focus-visible:ring-0"
                />
              </div>
            </form>

            <Button asChild size="sm" className="h-9 px-3">
              <Link to="/app/investigations/new">
                <span className="inline-flex items-center gap-2">
                  <Plus aria-hidden />
                  <span className="hidden sm:inline">Nouveau dossier</span>
                </span>
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex size-9 items-center justify-center rounded-sm border border-border transition-colors hover:bg-accent" aria-label={`Compte de ${shell.viewer.name}, ${ROLE_LABELS[shell.viewer.role as Role]}`} title={shell.viewer.name}>
                  <Avatar className="size-6 rounded-sm">
                    <AvatarFallback className="rounded-sm bg-brand text-micro font-semibold text-brand-foreground">{initials(shell.viewer.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-mono text-tiny tracking-label text-muted-foreground uppercase">Compte analyste</DropdownMenuLabel>
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
          </div>
        </div>
      </header>

      <main data-print="page" className="mx-auto w-full max-w-shell flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>

      <footer data-print="hide" className="mx-auto flex w-full max-w-shell flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-5 text-micro text-muted-foreground sm:px-6 lg:px-8">
        <span className="font-mono tracking-caps uppercase">SOCIA · Dossier d’investigation</span>
        <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden className="size-3.5 text-brand" />Aucune requête exécutée par SOCIA · UTC</span>
      </footer>
    </div>
  )
}
