'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useActiveFocus } from './queries'

export function formatClock(totalSec: number): string {
  const sign = totalSec < 0 ? '-' : ''
  const abs = Math.abs(totalSec)
  const minutes = Math.floor(abs / 60)
  const seconds = abs % 60
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * 進行中のフォーカスセッションと、経過・残り時間(1 秒ごとに更新)。
 * 予定時間に達したら一度だけ通知する(セッション自体は手動で終了する)。
 */
export function useFocusTimer() {
  const { data: session, isLoading } = useActiveFocus()
  const [now, setNow] = useState(() => Date.now())
  const notifiedFor = useRef<string | null>(null)

  const startedAt = session ? new Date(session.startedAt).getTime() : null
  const elapsedSec = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const remainingSec = session ? session.plannedSec - elapsedSec : 0

  useEffect(() => {
    if (!session) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [session])

  useEffect(() => {
    if (!session || remainingSec > 0 || notifiedFor.current === session.id) return
    notifiedFor.current = session.id
    toast.success('予定時間に達しました。お疲れさまです!', {
      description: '区切りのよいところで終了してください。',
      duration: 8000,
    })
  }, [session, remainingSec])

  // 計測中はタブのタイトルにも残り時間を出す
  useEffect(() => {
    if (!session) return
    const original = document.title
    document.title = `${session.kind === 'focus' ? '●' : '☕'} ${formatClock(remainingSec)} | ${original}`
    return () => {
      document.title = original
    }
  }, [session, remainingSec])

  return {
    session: session ?? null,
    isLoading,
    elapsedSec,
    remainingSec,
    progress: session ? Math.min(1, elapsedSec / session.plannedSec) : 0,
    isOver: Boolean(session) && remainingSec <= 0,
  }
}
