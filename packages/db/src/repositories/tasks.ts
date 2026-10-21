import {
  addDays,
  startOfDay,
  startOfWeek,
  type Task,
  type TaskCreate,
  type TaskListQuery,
  type TaskStatus,
  type TaskUpdate,
} from '@app/shared'
import { InvalidReferenceError, isRecordNotFound, NotFoundError } from '../errors'
import { resolveTagIds, type RepoContext } from './context'

interface TaskRow {
  id: string
  areaId: string | null
  title: string
  notes: string | null
  status: string
  priority: number
  estimateMin: number | null
  dueDate: Date | null
  position: number
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  tags: { tag: { name: string } }[]
}

const withTags = { tags: { include: { tag: true } } } as const

// 新規タスクは末尾に置く。並べ替え(position の差し込み)に余白を残すため、間隔を空ける。
const POSITION_STEP = 1024

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    areaId: row.areaId,
    title: row.title,
    notes: row.notes,
    status: row.status as TaskStatus,
    priority: row.priority,
    estimateMin: row.estimateMin,
    dueDate: row.dueDate?.toISOString() ?? null,
    position: row.position,
    completedAt: row.completedAt?.toISOString() ?? null,
    tags: row.tags.map((t) => t.tag.name).sort(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** 俯瞰の集計に使う、タスクの軽量な行 */
export interface TaskSummaryRow {
  areaId: string | null
  status: TaskStatus
  dueDate: Date | null
  estimateMin: number | null
}

export function createTaskRepository(ctx: RepoContext) {
  const { db, userId, now, tzOffsetMin } = ctx

  async function assertArea(areaId: string | null | undefined) {
    if (!areaId) return
    if ((await db.area.count({ where: { id: areaId, userId } })) === 0) {
      throw new InvalidReferenceError('領域')
    }
  }

  function dueWhere(due: NonNullable<TaskListQuery['due']>) {
    const current = now()
    const dayStart = startOfDay(current, tzOffsetMin)
    if (due === 'overdue') return { dueDate: { lt: current }, status: { not: 'done' } }
    if (due === 'today') return { dueDate: { gte: dayStart, lt: addDays(dayStart, 1) } }
    const weekStart = startOfWeek(current, tzOffsetMin)
    return { dueDate: { gte: weekStart, lt: addDays(weekStart, 7) } }
  }

  return {
    async list(query: TaskListQuery = {}): Promise<Task[]> {
      const rows = await db.task.findMany({
        where: {
          userId,
          ...(query.status && { status: query.status }),
          ...(query.areaId && { areaId: query.areaId }),
          ...(query.tag && { tags: { some: { tag: { name: query.tag } } } }),
          ...(query.q && { title: { contains: query.q } }),
          ...(query.due && dueWhere(query.due)),
        },
        include: withTags,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: query.limit ?? 100,
      })
      return rows.map(toTask)
    },

    async get(id: string): Promise<Task | null> {
      const row = await db.task.findFirst({ where: { id, userId }, include: withTags })
      return row ? toTask(row) : null
    },

    async create(input: TaskCreate): Promise<Task> {
      await assertArea(input.areaId)
      const tagIds = await resolveTagIds(ctx, input.tags)
      const last = await db.task.aggregate({ where: { userId }, _max: { position: true } })
      const status = input.status ?? 'todo'

      const row = await db.task.create({
        data: {
          userId,
          title: input.title,
          status,
          position: (last._max.position ?? 0) + POSITION_STEP,
          ...(input.notes != null && { notes: input.notes }),
          ...(input.areaId && { areaId: input.areaId }),
          ...(input.priority !== undefined && { priority: input.priority }),
          ...(input.estimateMin != null && { estimateMin: input.estimateMin }),
          ...(input.dueDate && { dueDate: new Date(input.dueDate) }),
          ...(status === 'done' && { completedAt: now() }),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        include: withTags,
      })
      return toTask(row)
    },

    async update(id: string, input: TaskUpdate): Promise<Task> {
      if (input.areaId !== undefined) await assertArea(input.areaId)
      const tagIds = input.tags ? await resolveTagIds(ctx, input.tags) : undefined

      try {
        const row = await db.task.update({
          where: { id, userId },
          data: {
            ...(input.title !== undefined && { title: input.title }),
            // null を渡すと値を消す。undefined は変更しない。
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.areaId !== undefined && { areaId: input.areaId }),
            ...(input.priority !== undefined && { priority: input.priority }),
            ...(input.estimateMin !== undefined && { estimateMin: input.estimateMin }),
            ...(input.dueDate !== undefined && {
              dueDate: input.dueDate ? new Date(input.dueDate) : null,
            }),
            ...(input.position !== undefined && { position: input.position }),
            ...(input.status !== undefined && {
              status: input.status,
              completedAt: input.status === 'done' ? now() : null,
            }),
            ...(tagIds && { tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) } }),
          },
          include: withTags,
        })
        return toTask(row)
      } catch (error) {
        if (isRecordNotFound(error)) throw new NotFoundError('task')
        throw error
      }
    },

    async remove(id: string): Promise<void> {
      const { count } = await db.task.deleteMany({ where: { id, userId } })
      if (count === 0) throw new NotFoundError('task')
    },

    async exists(id: string): Promise<boolean> {
      return (await db.task.count({ where: { id, userId } })) > 0
    },

    /** [from, to) に完了したタスク */
    async completedBetween(from: Date, to: Date): Promise<Task[]> {
      const rows = await db.task.findMany({
        where: { userId, status: 'done', completedAt: { gte: from, lt: to } },
        include: withTags,
        orderBy: { completedAt: 'asc' },
      })
      return rows.map(toTask)
    },

    /** [from, to) が期限の、未完了タスク */
    async dueBetween(from: Date, to: Date): Promise<Task[]> {
      const rows = await db.task.findMany({
        where: { userId, status: { not: 'done' }, dueDate: { gte: from, lt: to } },
        include: withTags,
        orderBy: { dueDate: 'asc' },
      })
      return rows.map(toTask)
    },

    async summaryRows(): Promise<TaskSummaryRow[]> {
      const rows = await db.task.findMany({
        where: { userId },
        select: { areaId: true, status: true, dueDate: true, estimateMin: true },
      })
      return rows.map((row) => ({ ...row, status: row.status as TaskStatus }))
    },
  }
}

export type TaskRepository = ReturnType<typeof createTaskRepository>
