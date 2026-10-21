import type { Task } from '@app/shared'

// 並べ替えの余白。新規タスクの末尾追加(API 側)と同じ間隔にしておく。
const POSITION_STEP = 1024

/** ドラッグ元を、対象の位置へ動かしたときの新しい position(前後の中間値)を返す */
export function positionAfterMove(list: Task[], movingId: string, targetId: string): number | null {
  const from = list.findIndex((t) => t.id === movingId)
  const to = list.findIndex((t) => t.id === targetId)
  if (from < 0 || to < 0 || from === to) return null

  const rest = list.filter((t) => t.id !== movingId)
  const targetIndex = rest.findIndex((t) => t.id === targetId)
  // 下へ動かすときは対象の後ろ、上へ動かすときは対象の前に入れる
  const insertAt = from < to ? targetIndex + 1 : targetIndex
  const before = rest[insertAt - 1]
  const after = rest[insertAt]

  if (before && after) return (before.position + after.position) / 2
  if (before) return before.position + POSITION_STEP
  if (after) return after.position - POSITION_STEP
  return 0
}
