import type { DbTarget } from '@app/shared'
import type { PrismaClient as PostgresClient } from './generated/postgres/client'

// アプリ側は常にこの型・getDb() だけを使う。
// sqlite / postgres のクライアントは同じ schema 原本から生成されるため、モデル API は構造的に同一。
export type Db = PostgresClient

export interface DbOptions {
  target?: DbTarget
  /** sqlite のファイル URL(例: file:./dev.db)。省略時は SQLITE_DATABASE_URL */
  sqliteUrl?: string
  /** postgres の接続文字列(プーラー経由)。省略時は DATABASE_URL */
  databaseUrl?: string
}

export function resolveDbTarget(value = process.env.DB_TARGET): DbTarget {
  if (value === 'postgres') return 'postgres'
  return 'sqlite'
}

function requireValue(value: string | undefined, name: string): string {
  if (!value)
    throw new Error(`${name} が未設定です(DB_TARGET に対応する接続情報を設定してください)`)
  return value
}

// 使わない側のドライバ(特に better-sqlite3 のネイティブモジュール)を読み込まないよう、動的 import にする。
export async function createDb(options: DbOptions = {}): Promise<Db> {
  const target = options.target ?? resolveDbTarget()

  if (target === 'postgres') {
    // 設定漏れは重いドライバを読み込む前に検出する
    const connectionString = requireValue(
      options.databaseUrl ?? process.env.DATABASE_URL,
      'DATABASE_URL',
    )
    const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
      import('./generated/postgres/client'),
      import('@prisma/adapter-pg'),
    ])
    return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  }

  const [{ PrismaClient }, { PrismaBetterSqlite3 }] = await Promise.all([
    import('./generated/sqlite/client'),
    import('@prisma/adapter-better-sqlite3'),
  ])
  const url = options.sqliteUrl ?? process.env.SQLITE_DATABASE_URL ?? 'file:./dev.db'
  const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
  return client as unknown as Db
}

let cached: Promise<Db> | undefined

/** プロセス内で共有する Db。HMR などで多重生成しないようキャッシュする。 */
export function getDb(): Promise<Db> {
  cached ??= createDb()
  return cached
}
