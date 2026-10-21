import type { Area, AreaCreate, AreaUpdate } from '@app/shared'
import { ConflictError, isRecordNotFound, isUniqueViolation, NotFoundError } from '../errors'
import type { RepoContext } from './context'

interface AreaRow {
  id: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

export function toArea(row: AreaRow): Area {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function createAreaRepository(ctx: RepoContext) {
  const { db, userId } = ctx

  return {
    async list(): Promise<Area[]> {
      const rows = await db.area.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
      return rows.map(toArea)
    },

    async create(input: AreaCreate): Promise<Area> {
      try {
        return toArea(
          await db.area.create({
            data: { userId, name: input.name, ...(input.color && { color: input.color }) },
          }),
        )
      } catch (error) {
        if (isUniqueViolation(error)) throw new ConflictError('同じ名前の領域がすでにあります')
        throw error
      }
    },

    async update(id: string, input: AreaUpdate): Promise<Area> {
      try {
        return toArea(
          await db.area.update({
            where: { id, userId },
            data: {
              ...(input.name !== undefined && { name: input.name }),
              ...(input.color !== undefined && { color: input.color }),
            },
          }),
        )
      } catch (error) {
        if (isRecordNotFound(error)) throw new NotFoundError('area')
        if (isUniqueViolation(error)) throw new ConflictError('同じ名前の領域がすでにあります')
        throw error
      }
    },

    /** 領域を削除する。紐づくタスクは削除されず、未分類(areaId = null)になる。 */
    async remove(id: string): Promise<void> {
      const { count } = await db.area.deleteMany({ where: { id, userId } })
      if (count === 0) throw new NotFoundError('area')
    },

    async exists(id: string): Promise<boolean> {
      return (await db.area.count({ where: { id, userId } })) > 0
    },
  }
}

export type AreaRepository = ReturnType<typeof createAreaRepository>
