import type { Task } from '@app/shared'
import { describe, expect, it } from 'vitest'
import { positionAfterMove } from './reorder'

const task = (id: string, position: number) => ({ id, position }) as Task

describe('positionAfterMove', () => {
  const list = [task('a', 1000), task('b', 2000), task('c', 3000), task('d', 4000)]

  it('moving up places the item before the target (midpoint of its neighbours)', () => {
    expect(positionAfterMove(list, 'c', 'b')).toBe(1500)
  })

  it('moving down places the item after the target', () => {
    expect(positionAfterMove(list, 'a', 'b')).toBe(2500)
  })

  it('moving to the very top or bottom extends past the end', () => {
    expect(positionAfterMove(list, 'd', 'a')).toBe(1000 - 1024)
    expect(positionAfterMove(list, 'a', 'd')).toBe(4000 + 1024)
  })

  it('returns null when nothing changes or an id is unknown', () => {
    expect(positionAfterMove(list, 'a', 'a')).toBeNull()
    expect(positionAfterMove(list, 'a', 'zzz')).toBeNull()
    expect(positionAfterMove(list, 'zzz', 'a')).toBeNull()
  })

  it('handles a list of two', () => {
    const two = [task('a', 10), task('b', 20)]
    expect(positionAfterMove(two, 'a', 'b')).toBe(20 + 1024)
    expect(positionAfterMove(two, 'b', 'a')).toBe(10 - 1024)
  })
})
