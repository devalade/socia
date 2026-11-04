import { HeadContent, Link, Scripts, createRootRoute, type ErrorComponentProps } from '@tanstack/react-router'
import { CircleAlert, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { EmptyState } from '@/components/patterns/empty-state'
import appCss from '../styles.css?url'

const themeScript = `(() => {
  try {
    const stored = localStorage.getItem('socia-theme');
    const dark = stored !== 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch {}
})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'SOCIA · Triage et investigation SOC' },
      {
        name: 'description',
        content:
          'SOCIA assiste les analystes SOC dans le triage et l’investigation des alertes Elastic Security et Security Onion, sans jamais exécuter de requête à leur place.',
      },
      { name: 'theme-color', content: '#0b0e14' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
    scripts: [{ children: themeScript }],
  }),
  shellComponent: RootDocument,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        <ThemeProvider>
          {children}
          <SociaToaster />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function SociaToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} position="bottom-right" closeButton />
}

function RootError({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <EmptyState
        icon={<CircleAlert aria-hidden />}
        title="Une erreur inattendue est survenue"
        description={error instanceof Error ? error.message : 'La page n’a pas pu se charger. Vos données enregistrées ne sont pas perdues.'}
        action={
          <Button asChild>
            <Link to="/app">Retour au tableau de bord</Link>
          </Button>
        }
      />
    </main>
  )
}

function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <EmptyState
        icon={<Compass aria-hidden />}
        title="Cette page n’existe pas"
        description="Le lien est peut-être obsolète, ou la ressource a été archivée."
        action={
          <Button asChild>
            <Link to="/app">Retour au tableau de bord</Link>
          </Button>
        }
      />
    </main>
  )
}
