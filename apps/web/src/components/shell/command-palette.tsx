'use client'

import {
  CornerDownLeft,
  FolderKanban,
  Keyboard,
  LogOut,
  Moon,
  Play,
  Plus,
  Search,
  Square,
  type LucideIcon,
} from 'lucide-react'
import { Command } from 'cmdk'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Kbd } from '@/components/ui/misc'
import { errorMessage } from '@/lib/api'
import { useCreateTask, useStopFocus } from '@/lib/queries'
import { createClient } from '@/lib/supabase/client'
import { useFocusTimer } from '@/lib/use-focus-timer'
import { NAV_ITEMS } from './nav'
import { useUi } from './ui-context'

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground'

function Item({
  icon: Icon,
  children,
  hint,
  ...props
}: React.ComponentProps<typeof Command.Item> & { icon: LucideIcon; hint?: string }) {
  return (
    <Command.Item className={itemClass} {...props}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{children}</span>
      {hint && <Kbd>{hint}</Kbd>}
    </Command.Item>
  )
}

export function CommandPalette() {
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const ui = useUi()
  const createTask = useCreateTask()
  const stopFocus = useStopFocus()
  const { session } = useFocusTimer()
  const [query, setQuery] = useState('')

  const text = query.trim()

  function run(action: () => void) {
    ui.setPaletteOpen(false)
    setQuery('')
    action()
  }

  async function quickAdd() {
    const title = text
    run(() => {})
    try {
      await createTask.mutateAsync({ title })
      toast.success(`「${title}」を追加しました`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <Command.Dialog
      open={ui.paletteOpen}
      onOpenChange={(open) => {
        ui.setPaletteOpen(open)
        if (!open) setQuery('')
      }}
      label="コマンドパレット"
      loop
      overlayClassName="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0"
      contentClassName="fixed top-[18%] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
    >
      <DialogPrimitive.Title className="sr-only">コマンドパレット</DialogPrimitive.Title>
      <DialogPrimitive.Description className="sr-only">
        入力して、タスクの追加・画面の移動・操作ができます。
      </DialogPrimitive.Description>

      <div className="flex items-center gap-3 border-b px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="タスクを追加、または操作を検索…"
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Kbd>Esc</Kbd>
      </div>

      <Command.List className="max-h-[min(24rem,60dvh)] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
          見つかりませんでした。
        </Command.Empty>

        {text && (
          <Command.Group
            heading="タスク"
            className="pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            <Command.Item
              forceMount
              value={`__add ${text}`}
              onSelect={quickAdd}
              className={itemClass}
            >
              <Plus className="size-4 shrink-0 text-primary" />
              <span className="flex-1 truncate">
                「<strong>{text}</strong>」をタスクに追加
              </span>
              <CornerDownLeft className="size-3.5 text-muted-foreground" />
            </Command.Item>
            <Command.Item
              forceMount
              value={`__detail ${text}`}
              onSelect={() => run(() => ui.openCapture({ title: text }))}
              className={itemClass}
            >
              <Plus className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">詳細を設定して追加…</span>
            </Command.Item>
            <Command.Item
              forceMount
              value={`__search ${text}`}
              onSelect={() => run(() => router.push(`/tasks?q=${encodeURIComponent(text)}`))}
              className={itemClass}
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">タスクを検索</span>
            </Command.Item>
          </Command.Group>
        )}

        <Command.Group
          heading="移動"
          className="pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          {NAV_ITEMS.map((item) => (
            <Item
              key={item.href}
              icon={item.icon}
              value={`移動 ${item.label}`}
              onSelect={() => run(() => router.push(item.href))}
            >
              {item.label}
            </Item>
          ))}
        </Command.Group>

        <Command.Group
          heading="操作"
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Item
            icon={Plus}
            hint="C"
            value="新規タスク 追加"
            onSelect={() => run(() => ui.openCapture())}
          >
            新規タスク
          </Item>
          {session ? (
            <Item
              icon={Square}
              hint="F"
              value="フォーカス 終了 停止"
              onSelect={() =>
                run(() =>
                  stopFocus.mutate(session.id, {
                    onSuccess: () => toast.success('お疲れさまでした。記録しました'),
                    onError: (e) => toast.error(errorMessage(e)),
                  }),
                )
              }
            >
              フォーカスを終了
            </Item>
          ) : (
            <Item
              icon={Play}
              hint="F"
              value="フォーカス 開始"
              onSelect={() => run(() => ui.openFocus())}
            >
              フォーカスを開始
            </Item>
          )}
          <Item
            icon={FolderKanban}
            value="領域 管理"
            onSelect={() => run(() => ui.setAreasOpen(true))}
          >
            領域を管理
          </Item>
          <Item
            icon={Moon}
            value="テーマ 切替 ダーク ライト"
            onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}
          >
            {resolvedTheme === 'dark' ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え'}
          </Item>
          <Item
            icon={Keyboard}
            hint="?"
            value="ショートカット 一覧 キーボード"
            onSelect={() => run(() => ui.setShortcutsOpen(true))}
          >
            ショートカット一覧
          </Item>
          <Item icon={LogOut} value="ログアウト サインアウト" onSelect={() => run(signOut)}>
            ログアウト
          </Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
