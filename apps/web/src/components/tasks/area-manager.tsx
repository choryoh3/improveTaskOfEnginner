'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useUi } from '@/components/shell/ui-context'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { useAreas, useCreateArea, useDeleteArea, useUpdateArea } from '@/lib/queries'

const SWATCHES = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
]

export function AreaManager() {
  const { areasOpen, setAreasOpen } = useUi()
  const { data: areas, isLoading } = useAreas()
  const create = useCreateArea()
  const update = useUpdateArea()
  const remove = useDeleteArea()
  const [name, setName] = useState('')

  async function add(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    try {
      await create.mutateAsync({ name, color: SWATCHES[(areas?.length ?? 0) % SWATCHES.length] })
      setName('')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={areasOpen} onOpenChange={setAreasOpen}>
      <DialogContent aria-describedby="areas-description" className="max-w-md">
        <div className="space-y-1">
          <DialogTitle>領域を管理</DialogTitle>
          <DialogDescription id="areas-description">
            プロジェクトや担当領域ごとにタスクを分けると、Overview で進捗を俯瞰できます。
          </DialogDescription>
        </div>

        <ul className="grid max-h-64 gap-1 overflow-y-auto" aria-label="領域の一覧">
          {isLoading && <li className="text-sm text-muted-foreground">読み込み中…</li>}
          {areas?.length === 0 && (
            <li className="rounded-lg bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
              まだ領域がありません。下のフォームから追加してください。
            </li>
          )}
          {areas?.map((area) => (
            <li
              key={area.id}
              className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/60"
            >
              <input
                type="color"
                aria-label={`${area.name} の色`}
                defaultValue={area.color}
                onBlur={(e) =>
                  e.target.value !== area.color &&
                  update.mutate({ id: area.id, patch: { color: e.target.value } })
                }
                className="size-7 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
              />
              <Input
                aria-label={`${area.name} の名前`}
                defaultValue={area.name}
                maxLength={50}
                onBlur={(e) => {
                  const next = e.target.value.trim()
                  if (!next) e.target.value = area.name
                  else if (next !== area.name) {
                    update.mutate(
                      { id: area.id, patch: { name: next } },
                      {
                        onError: (error) => {
                          e.target.value = area.name
                          toast.error(errorMessage(error))
                        },
                      },
                    )
                  }
                }}
                className="h-8 border-transparent bg-transparent shadow-none hover:border-input"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${area.name} を削除`}
                onClick={() => {
                  if (
                    !confirm(
                      `「${area.name}」を削除しますか?\nタスクは削除されず、未分類になります。`,
                    )
                  )
                    return
                  remove.mutate(area.id, { onError: (error) => toast.error(errorMessage(error)) })
                }}
              >
                <Trash2 className="text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>

        <form onSubmit={add} className="flex gap-2">
          <Input
            aria-label="新しい領域の名前"
            placeholder="新しい領域(例: 開発、運用、学習)"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            <Plus /> 追加
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
