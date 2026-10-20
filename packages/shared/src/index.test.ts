import { describe, expect, it } from 'vitest'
import { APP_NAME, DB_TARGETS } from './index'

describe('shared constants', () => {
  it('exposes the app name', () => {
    expect(APP_NAME).toBe('improveTaskOfEnginner')
  })

  it('supports sqlite and postgres', () => {
    expect(DB_TARGETS).toEqual(['sqlite', 'postgres'])
  })
})
