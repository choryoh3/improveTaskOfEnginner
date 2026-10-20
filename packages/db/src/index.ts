import type { DbTarget } from '@app/shared'

export function resolveDbTarget(value = process.env.DB_TARGET): DbTarget {
  if (value === 'postgres') return 'postgres'
  return 'sqlite'
}
