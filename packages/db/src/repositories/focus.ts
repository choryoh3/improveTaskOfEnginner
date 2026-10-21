import type { FocusKind, FocusSession, FocusStart } from '@app/shared'
import { ConflictError, InvalidReferenceError, NotFoundError } from '../errors'
import type { RepoContext } from './context'

interface FocusRow {
  id: string
  taskId: string | null
  kind: string
  plannedSec: number
  startedAt: Date
  endedAt: Date | null
  durationSec: number
}

function toFocusSession(row: FocusRow): FocusSession {
  return {
    id: row.id,
    taskId: row.taskId,
    kind: row.kind as FocusKind,
    plannedSec: row.plannedSec,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    durationSec: row.durationSec,
  }
}

export function createFocusRepository(ctx: RepoContext) {
  const { db, userId, now } = ctx

  return {
    /** 進行中のセッション(終了していないもの) */
    async active(): Promise<FocusSession | null> {
      const row = await db.focusSession.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      })
      return row ? toFocusSession(row) : null
    },

    /** 開始する。進行中のセッションがあれば衝突として扱う(同時に 1 つだけ)。 */
    async start(input: FocusStart): Promise<FocusSession> {
      if (await db.focusSession.count({ where: { userId, endedAt: null } })) {
        throw new ConflictError('進行中のセッションがあります。先に終了してください')
      }
      if (input.taskId && (await db.task.count({ where: { id: input.taskId, userId } })) === 0) {
        throw new InvalidReferenceError('タスク')
      }
      const row = await db.focusSession.create({
        data: {
          userId,
          startedAt: now(),
          ...(input.taskId && { taskId: input.taskId }),
          ...(input.kind && { kind: input.kind }),
          ...(input.plannedSec && { plannedSec: input.plannedSec }),
        },
      })
      return toFocusSession(row)
    },

    /** 終了する。経過時間を durationSec に記録する。 */
    async stop(id: string): Promise<FocusSession> {
      const current = await db.focusSession.findFirst({ where: { id, userId, endedAt: null } })
      if (!current) throw new NotFoundError('focus session')
      const endedAt = now()
      const durationSec = Math.max(
        0,
        Math.round((endedAt.getTime() - current.startedAt.getTime()) / 1000),
      )
      const row = await db.focusSession.update({
        where: { id, userId },
        data: { endedAt, durationSec },
      })
      return toFocusSession(row)
    },

    /** [from, to) に開始したセッション */
    async listBetween(from: Date, to: Date): Promise<FocusSession[]> {
      const rows = await db.focusSession.findMany({
        where: { userId, startedAt: { gte: from, lt: to } },
        orderBy: { startedAt: 'asc' },
      })
      return rows.map(toFocusSession)
    },
  }
}

export type FocusRepository = ReturnType<typeof createFocusRepository>
