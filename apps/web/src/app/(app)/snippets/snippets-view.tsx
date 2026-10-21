'use client'

import { snippetCreateSchema, type Snippet } from '@app/shared'
import { Code2, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Badge, Card, Label, Skeleton } from '@/components/ui/misc'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/page'
import { errorMessage } from '@/lib/api'
import { useCreateSnippet, useDeleteSnippet, useSnippets, useUpdateSnippet } from '@/lib/queries'
import { parseTags } from '@/lib/task-ui'
import { cn } from '@/lib/utils'

const LANGUAGES = ['bash', 'sql', 'typescript', 'javascript', 'python', 'json', 'yaml', 'markdown']

export function SnippetsView() {
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [editing, setEditing] = useState<Snippet | 'new' | null>(null)

  const [q, setQ] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isPending, isError, error, refetch } = useSnippets({
    ...(q && { q }),
    ...(tag && { tag }),
  })
  const remove = useDeleteSnippet()

  const tags = useMemo(() => {
    const names = new Set((data ?? []).flatMap((s) => s.tags))
    if (tag) names.add(tag)
    return [...names].sort()
  }, [data, tag])

  return (
    <>
      <PageHeader
        title="ナレッジ"
        description="よく使うコマンドやメモを保存して、すぐに引き出せます。"
        actions={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus /> 追加
          </Button>
        }
      />

      <div className="mb-4 grid gap-3">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="ナレッジを検索"
            placeholder="タイトルと本文から検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="タグで絞り込み">
            {tags.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={tag === name}
                onClick={() => setTag(tag === name ? '' : name)}
                className={cn(
                  'cursor-pointer rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                  tag === name
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:border-primary/50 hover:text-foreground',
                )}
              >
                #{name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        q || tag ? (
          <EmptyState
            icon={Search}
            title="見つかりませんでした"
            description="検索や絞り込みを変えてみてください。"
          />
        ) : (
          <EmptyState
            icon={Code2}
            title="最初のナレッジを保存しましょう"
            description="git のコマンド、SQL、手順メモなど、何度も調べるものがおすすめです。"
            action={
              <Button onClick={() => setEditing('new')}>
                <Plus /> ナレッジを追加
              </Button>
            }
          />
        )
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((snippet) => (
            <li key={snippet.id}>
              <Card className="group flex h-full animate-fade-up flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <h2 className="truncate font-semibold">{snippet.title}</h2>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {snippet.language && <Badge tone="primary">{snippet.language}</Badge>}
                      {snippet.tags.map((name) => (
                        <span key={name} className="text-xs text-primary/80">
                          #{name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="編集"
                      onClick={() => setEditing(snippet)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="削除"
                      onClick={() => {
                        if (!confirm(`「${snippet.title}」を削除しますか?`)) return
                        remove.mutate(snippet.id, {
                          onSuccess: () => toast.success('削除しました'),
                          onError: (e) => toast.error(errorMessage(e)),
                        })
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="relative min-h-0 flex-1">
                  <pre className="max-h-44 overflow-auto rounded-lg bg-muted p-3 pr-12 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap break-words">
                    <code>{snippet.body}</code>
                  </pre>
                  <div className="absolute top-1.5 right-1.5">
                    <CopyButton
                      text={snippet.body}
                      label={`${snippet.title} をコピー`}
                      iconOnly
                      variant="ghost"
                    />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent aria-describedby="snippet-description" className="max-w-xl">
          {editing !== null && (
            <SnippetForm
              key={editing === 'new' ? 'new' : editing.id}
              snippet={editing === 'new' ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function SnippetForm({ snippet, onDone }: { snippet?: Snippet; onDone: () => void }) {
  const create = useCreateSnippet()
  const update = useUpdateSnippet()
  const [title, setTitle] = useState(snippet?.title ?? '')
  const [language, setLanguage] = useState(snippet?.language ?? '')
  const [body, setBody] = useState(snippet?.body ?? '')
  const [tags, setTags] = useState(snippet?.tags.join(', ') ?? '')
  const [error, setError] = useState<string | null>(null)
  const pending = create.isPending || update.isPending

  async function submit(event?: React.FormEvent) {
    event?.preventDefault()
    setError(null)
    const parsed = snippetCreateSchema.safeParse({
      title,
      body,
      language: language.trim() || null,
      tags: parseTags(tags),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '入力内容を確認してください')
      return
    }
    try {
      if (snippet) await update.mutateAsync({ id: snippet.id, patch: parsed.data })
      else await create.mutateAsync(parsed.data)
      toast.success(snippet ? '更新しました' : '保存しました')
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit()
      }}
      className="grid gap-4"
    >
      <div className="space-y-1">
        <DialogTitle>{snippet ? 'ナレッジを編集' : 'ナレッジを追加'}</DialogTitle>
        <DialogDescription id="snippet-description">
          ⌘/Ctrl + Enter で保存できます。
        </DialogDescription>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="snippet-title">タイトル</Label>
        <Input
          id="snippet-title"
          autoFocus
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 直前のコミットを修正する"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="snippet-language">言語(任意)</Label>
          <Input
            id="snippet-language"
            list="snippet-languages"
            maxLength={30}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="bash"
          />
          <datalist id="snippet-languages">
            {LANGUAGES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="snippet-tags">タグ</Label>
          <Input
            id="snippet-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="git, 運用(カンマ区切り)"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="snippet-body">本文</Label>
        <Textarea
          id="snippet-body"
          required
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-[0.8125rem]"
          placeholder="git commit --amend --no-edit"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          キャンセル
        </Button>
        <Button type="submit" disabled={pending || !title.trim() || !body.trim()}>
          {pending && <Loader2 className="animate-spin" />}
          保存
        </Button>
      </div>
    </form>
  )
}
