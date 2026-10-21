import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, resolveDbTarget, type Db } from './client'
import { createTestDb, type TestDb } from './testing'

describe('resolveDbTarget', () => {
  it('defaults to sqlite', () => {
    expect(resolveDbTarget(undefined)).toBe('sqlite')
    expect(resolveDbTarget('unknown')).toBe('sqlite')
  })

  it('selects postgres only when asked', () => {
    expect(resolveDbTarget('postgres')).toBe('postgres')
  })
})

describe('createDb', () => {
  it('requires DATABASE_URL for postgres', async () => {
    const saved = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    try {
      await expect(createDb({ target: 'postgres' })).rejects.toThrow('DATABASE_URL')
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved
    }
  })
})

describe('sqlite schema (migrations applied to a temp db)', () => {
  let testDb: TestDb
  let db: Db

  beforeAll(async () => {
    testDb = await createTestDb()
    db = testDb.db
  }, 30_000)

  afterAll(async () => {
    await testDb?.cleanup()
  })

  it('allows the same area name for different users but not for the same user', async () => {
    await db.area.create({ data: { userId: 'u1', name: 'Work' } })
    await db.area.create({ data: { userId: 'u2', name: 'Work' } })
    await expect(db.area.create({ data: { userId: 'u1', name: 'Work' } })).rejects.toThrow()
  })

  it('applies column defaults', async () => {
    const task = await db.task.create({ data: { userId: 'u1', title: 'レビュー' } })
    expect(task).toMatchObject({ status: 'todo', priority: 1, position: 0, areaId: null })
  })

  it('sets areaId to null when the area is deleted', async () => {
    const area = await db.area.create({ data: { userId: 'u3', name: 'Temp' } })
    const task = await db.task.create({ data: { userId: 'u3', title: 't', areaId: area.id } })
    await db.area.delete({ where: { id: area.id } })
    expect((await db.task.findUniqueOrThrow({ where: { id: task.id } })).areaId).toBeNull()
  })

  it('cascades task deletion to task tags and keeps the tag', async () => {
    const tag = await db.tag.create({ data: { userId: 'u4', name: 'bug' } })
    const task = await db.task.create({
      data: { userId: 'u4', title: 't', tags: { create: [{ tagId: tag.id }] } },
    })
    await db.task.delete({ where: { id: task.id } })
    expect(await db.taskTag.count({ where: { taskId: task.id } })).toBe(0)
    expect(await db.tag.count({ where: { id: tag.id } })).toBe(1)
  })
})
