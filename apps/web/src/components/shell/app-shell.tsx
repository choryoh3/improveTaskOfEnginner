'use client'

import { LogOut, Moon, Plus, Search, Square, Sun, Timer, UserRound } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FocusDialog } from '@/components/focus/focus-dialog'
import { LogoMark } from '@/components/logo'
import { AreaManager } from '@/components/tasks/area-manager'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/misc'
import { errorMessage } from '@/lib/api'
import { useStopFocus } from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'
import { formatClock, useFocusTimer } from '@/lib/use-focus-timer'
import { useHotkeys } from '@/lib/use-hotkeys'
import { cn } from '@/lib/utils'
import { CommandPalette } from './command-palette'
import { NAV_ITEMS } from './nav'
import { ShortcutsDialog } from './shortcuts-dialog'
import { UiProvider, useUi } from './ui-context'

export function AppShell({ email, children }: { email: string | null; children: React.ReactNode }) {
  return (
    <UiProvider>
      <Shell email={email}>{children}</Shell>
    </UiProvider>
  )
}

function Shell({ email, children }: { email: string | null; children: React.ReactNode }) {
  const router = useRouter()
  const ui = useUi()
  const stopFocus = useStopFocus()
  const { session } = useFocusTimer()

  useHotkeys({
    onPalette: () => ui.setPaletteOpen(!ui.paletteOpen),
    single: {
      c: () => ui.openCapture(),
      '?': () => ui.setShortcutsOpen(true),
      f: () => {
        if (!session) return ui.openFocus()
        stopFocus.mutate(session.id, {
          onSuccess: () => toast.success('お疲れさまでした。記録しました'),
          onError: (e) => toast.error(errorMessage(e)),
        })
      },
    },
    goto: Object.fromEntries(NAV_ITEMS.map((item) => [item.key, () => router.push(item.href)])),
  })

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        メインコンテンツへスキップ
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Header email={email} />
        <main id="main" className="flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pb-12">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <MobileNav />

      <CommandPalette />
      <ShortcutsDialog />
      <AreaManager />
      <FocusDialog />
      <TaskDialog
        open={ui.captureOpen}
        onOpenChange={(open) => !open && ui.closeCapture()}
        defaults={ui.captureDefaults}
      />
    </div>
  )
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function Sidebar() {
  const pathname = usePathname()
  const ui = useUi()
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card/60 px-3 py-5 backdrop-blur lg:flex">
      <Link href="/" className="flex items-center gap-2.5 rounded-lg px-2 py-1">
        <LogoMark className="size-7" />
        <span className="text-[0.95rem] leading-tight font-semibold tracking-tight">
          improveTask
          <br />
          <span className="text-xs font-normal text-muted-foreground">Engineer cockpit</span>
        </span>
      </Link>

      <nav aria-label="メイン" className="grid gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              <span className="hidden gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 xl:flex">
                <Kbd>G</Kbd>
                <Kbd>{item.key.toUpperCase()}</Kbd>
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto grid gap-2">
        <Button variant="outline" size="sm" onClick={() => ui.setAreasOpen(true)}>
          領域を管理
        </Button>
        <p className="px-1 text-xs text-muted-foreground">
          <Kbd>?</Kbd> でショートカット一覧
        </p>
      </div>
    </aside>
  )
}

function MobileNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-[0.6875rem] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <item.icon className="size-5" />
            {item.shortLabel}
          </Link>
        )
      })}
    </nav>
  )
}

function Header({ email }: { email: string | null }) {
  const ui = useUi()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-10">
      <Link href="/" className="mr-1 flex items-center gap-2 lg:hidden" aria-label="Today へ">
        <LogoMark className="size-7" />
      </Link>

      <button
        type="button"
        onClick={() => ui.setPaletteOpen(true)}
        className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-soft transition-colors hover:border-primary/40 sm:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">検索・追加・移動</span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <FocusChip />
        <Button size="sm" onClick={() => ui.openCapture()} className="hidden sm:inline-flex">
          <Plus /> タスク
        </Button>
        <Button
          size="icon"
          onClick={() => ui.openCapture()}
          aria-label="タスクを追加"
          className="sm:hidden"
        >
          <Plus />
        </Button>
        <ThemeToggle />
        <UserMenu email={email} />
      </div>
    </header>
  )
}

function FocusChip() {
  const ui = useUi()
  const stopFocus = useStopFocus()
  const { session, remainingSec, progress, isOver } = useFocusTimer()

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => ui.openFocus()}
        aria-label="フォーカスを開始"
      >
        <Timer /> <span className="hidden md:inline">フォーカス</span>
      </Button>
    )
  }

  return (
    <div
      role="timer"
      aria-label={`${session.kind === 'focus' ? '集中' : '休憩'}中 残り ${formatClock(remainingSec)}`}
      className={cn(
        'relative flex h-8 items-center gap-2 overflow-hidden rounded-lg border pr-1 pl-3 text-sm font-medium tabular-nums',
        isOver
          ? 'border-success/50 bg-success/10 text-success'
          : 'border-primary/40 bg-accent text-accent-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-1000 ease-linear"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">{formatClock(remainingSec)}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative size-6"
        aria-label="終了する"
        onClick={() =>
          stopFocus.mutate(session.id, {
            onSuccess: () => toast.success('お疲れさまでした。記録しました'),
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      >
        <Square className="size-3" />
      </Button>
    </div>
  )
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="テーマを切り替え"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {/* SSR とクライアントで結果が変わらないよう、CSS(dark:)で出し分ける */}
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  )
}

function UserMenu({ email }: { email: string | null }) {
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="アカウント">
          <UserRound />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-52 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {email && (
            <div className="truncate px-2.5 py-2 text-xs text-muted-foreground">{email}</div>
          )}
          <DropdownMenu.Item
            onSelect={signOut}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
          >
            <LogOut className="size-4" /> ログアウト
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
