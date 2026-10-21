'use client'

import { useEffect, useEffectEvent } from 'react'

export interface Hotkeys {
  /** ⌘/Ctrl + K */
  onPalette: () => void
  /** 単独キー: 入力中は無効 */
  single: Record<string, () => void>
  /** `g` を押したあとに続けて押すキー(1.2 秒以内) */
  goto: Record<string, () => void>
}

const SEQUENCE_TIMEOUT_MS = 1200

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useHotkeys(hotkeys: Hotkeys) {
  // 最新のハンドラーを参照しつつ、リスナーの付け外しは 1 回で済ませる
  const handle = useEffectEvent((event: KeyboardEvent, state: { pending: boolean }) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      hotkeys.onPalette()
      return
    }
    if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
    // ダイアログが開いている間は、背景のショートカットを発火させない(閉じる途中のものは数えない)
    if (document.querySelector('[role="dialog"][data-state="open"]')) return

    const key = event.key.toLowerCase()
    if (state.pending) {
      state.pending = false
      const action = hotkeys.goto[key]
      if (action) {
        event.preventDefault()
        action()
      }
      return
    }
    if (key === 'g') {
      state.pending = true
      return
    }
    const action = hotkeys.single[event.key] ?? hotkeys.single[key]
    if (action) {
      event.preventDefault()
      action()
    }
  })

  useEffect(() => {
    const state = { pending: false }
    let timer: ReturnType<typeof setTimeout> | undefined

    const onKeyDown = (event: KeyboardEvent) => {
      const wasPending = state.pending
      handle(event, state)
      if (state.pending && !wasPending) {
        clearTimeout(timer)
        timer = setTimeout(() => (state.pending = false), SEQUENCE_TIMEOUT_MS)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(timer)
    }
  }, [])
}
