// schema.base.prisma から provider 別の schema を生成し、prisma generate を実行する。
//   node scripts/gen.mjs           → sqlite / postgres の両方
//   node scripts/gen.mjs sqlite    → 指定した方のみ
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROVIDERS = { sqlite: 'sqlite', postgres: 'postgresql' }

const requested = process.argv[2]
if (requested && !(requested in PROVIDERS)) {
  console.error(`未対応の DB_TARGET: ${requested}(sqlite | postgres)`)
  process.exit(1)
}
const targets = requested ? [requested] : Object.keys(PROVIDERS)

const base = readFileSync(resolve(root, 'prisma/schema.base.prisma'), 'utf8')
mkdirSync(resolve(root, 'prisma/generated'), { recursive: true })

for (const target of targets) {
  const schema = base
    .replaceAll('__PROVIDER__', PROVIDERS[target])
    // schema ファイル(prisma/generated/)からの相対パス
    .replaceAll('__OUTPUT__', `../../src/generated/${target}`)
  const schemaPath = resolve(root, `prisma/generated/schema.${target}.prisma`)
  writeFileSync(
    schemaPath,
    `// 自動生成: 編集禁止(原本は prisma/schema.base.prisma、生成は pnpm db:gen)\n${schema}`,
  )

  const result = spawnSync('pnpm', ['exec', 'prisma', 'generate'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DB_TARGET: target },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
