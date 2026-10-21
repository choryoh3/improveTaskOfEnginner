import { describe, expect, it } from 'vitest'
import {
  focusStartSchema,
  taskCreateSchema,
  taskListQuerySchema,
  taskUpdateSchema,
} from './schemas'

describe('taskCreateSchema', () => {
  it('accepts a minimal task and trims the title', () => {
    expect(taskCreateSchema.parse({ title: '  レビュー対応  ' }).title).toBe('レビュー対応')
  })

  it('rejects an empty title and an unknown status', () => {
    expect(taskCreateSchema.safeParse({ title: '   ' }).success).toBe(false)
    expect(taskCreateSchema.safeParse({ title: 'a', status: 'wip' }).success).toBe(false)
  })

  it('requires ISO 8601 dates', () => {
    expect(taskCreateSchema.safeParse({ title: 'a', dueDate: '2026-10-21' }).success).toBe(false)
    expect(
      taskCreateSchema.safeParse({ title: 'a', dueDate: '2026-10-21T09:00:00+09:00' }).success,
    ).toBe(true)
  })
})

describe('taskUpdateSchema', () => {
  it('does not inject defaults into a patch', () => {
    expect(taskUpdateSchema.parse({ title: 'x' })).toEqual({ title: 'x' })
    expect(taskUpdateSchema.parse({})).toEqual({})
  })
})

describe('taskListQuerySchema', () => {
  it('coerces limit from a query string', () => {
    expect(taskListQuerySchema.parse({ limit: '50' }).limit).toBe(50)
  })

  it('rejects a limit above 200', () => {
    expect(taskListQuerySchema.safeParse({ limit: '500' }).success).toBe(false)
  })
})

describe('focusStartSchema', () => {
  it('rejects a planned duration under one minute', () => {
    expect(focusStartSchema.safeParse({ plannedSec: 10 }).success).toBe(false)
  })
})
