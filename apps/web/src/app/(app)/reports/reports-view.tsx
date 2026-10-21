'use client'

import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Input } from '@/components/ui/input'
import { Card, Skeleton } from '@/components/ui/misc'
import { ErrorState, PageHeader } from '@/components/ui/page'
import { errorMessage } from '@/lib/api'
import { useReport } from '@/lib/queries'
import { cn } from '@/lib/utils'

type ReportType = 'daily' | 'weekly'

/** YYYY-MM-DD を日数ぶんずらす(暦日の計算なのでタイムゾーンの影響を受けない UTC で行う) */
function shiftDate(date: string, days: number) {
  const shifted = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
  return shifted.toISOString().slice(0, 10)
}

export function ReportsView() {
  const [type, setType] = useState<ReportType>('daily')
  // 空文字は「今日(サーバーの基準)」
  const [date, setDate] = useState('')
  const { data, isPending, isError, error, refetch } = useReport({
    type,
    ...(date && { date }),
  })

  const step = type === 'daily' ? 1 : 7

  return (
    <>
      <PageHeader
        title="日報・レビュー"
        description="完了したタスクと集中時間から、日報と週次レビューを自動で作ります。"
        actions={
          data && <CopyButton text={data.markdown} label="Markdown をコピー" variant="default" />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="種類" className="flex rounded-lg bg-muted p-1">
          {(
            [
              ['daily', '日報'],
              ['weekly', '週次レビュー'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={type === value}
              onClick={() => setType(value)}
              className={cn(
                'cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                type === value
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={type === 'daily' ? '前の日' : '前の週'}
            disabled={!data}
            onClick={() => data && setDate(shiftDate(data.from, -step))}
          >
            <ChevronLeft />
          </Button>
          <Input
            type="date"
            aria-label="基準日"
            value={data?.from ?? ''}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <Button
            variant="outline"
            size="icon"
            aria-label={type === 'daily' ? '次の日' : '次の週'}
            disabled={!data}
            onClick={() => data && setDate(shiftDate(data.from, step))}
          >
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate('')} disabled={!date}>
            今日に戻す
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : isPending ? (
        <Card className="grid gap-3 p-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </Card>
      ) : (
        <Card className="animate-fade-up p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            {data.from === data.to ? data.from : `${data.from} 〜 ${data.to}`}
          </div>
          <MarkdownLite source={data.markdown} />
        </Card>
      )}
    </>
  )
}

/** 日報の Markdown(見出し・箇条書き)だけを描画する軽量ビュー */
function MarkdownLite({ source }: { source: string }) {
  const blocks: React.ReactNode[] = []
  let items: string[] = []

  const flush = (key: number) => {
    if (items.length === 0) return
    blocks.push(
      <ul key={`list-${key}`} className="mb-5 grid gap-1.5 pl-5">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              'list-disc text-sm leading-relaxed marker:text-primary',
              item === 'なし' && 'list-none -ml-5 text-muted-foreground',
            )}
          >
            {item}
          </li>
        ))}
      </ul>,
    )
    items = []
  }

  source.split('\n').forEach((line, index) => {
    if (line.startsWith('- ')) {
      items.push(line.slice(2))
      return
    }
    flush(index)
    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={index} className="mt-6 mb-2 text-sm font-semibold text-primary first:mt-0">
          {line.slice(3)}
        </h3>,
      )
    } else if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={index} className="mb-4 text-xl font-bold tracking-tight">
          {line.slice(2)}
        </h2>,
      )
    }
  })
  flush(source.length)

  return <article>{blocks}</article>
}
