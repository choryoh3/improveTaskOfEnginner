// テスト専用: 使い捨ての SQLite に、コミット済みの migration.sql を適用した Db を作る。
// prisma CLI の起動が環境によって非常に遅いため、SQL を接続経由で直接適用する。
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb, type Db } from './client'

const migrationsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../prisma/migrations/sqlite',
)

function migrationStatements(): string[] {
  const names = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  return names.flatMap((name) =>
    readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8')
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('--'))
      .join(' ')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean),
  )
}

export interface TestDb {
  db: Db
  cleanup: () => Promise<void>
}

export async function createTestDb(): Promise<TestDb> {
  const dir = mkdtempSync(join(tmpdir(), 'ite-db-'))
  const sqliteUrl = `file:${join(dir, 'test.db').replaceAll('\\', '/')}`
  const db = await createDb({ target: 'sqlite', sqliteUrl })
  for (const statement of migrationStatements()) await db.$executeRawUnsafe(statement)
  return {
    db,
    cleanup: async () => {
      await db.$disconnect()
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
