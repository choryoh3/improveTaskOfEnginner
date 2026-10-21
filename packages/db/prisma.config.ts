import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prisma 7: 接続 URL は schema ではなくここで指定する(CLI 用)。実行時の接続は src/client.ts のアダプターが担う。
// DB_TARGET で schema・migrations・接続先を切り替える。
config({ path: '../../.env.local', quiet: true })
config({ path: '../../.env', quiet: true })

const target = process.env.DB_TARGET === 'postgres' ? 'postgres' : 'sqlite'

// CLI(マイグレーション)は直結 URL。generate など DB 不要のコマンドでも読み込まれるため空文字を許容する。
const url =
  target === 'postgres'
    ? (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '')
    : (process.env.SQLITE_DATABASE_URL ?? 'file:./dev.db')

export default defineConfig({
  schema: `prisma/generated/schema.${target}.prisma`,
  migrations: { path: `prisma/migrations/${target}` },
  datasource: { url },
})
