// Stop: 型チェックに失敗していたら、修正を促して続行させる(無限ループ防止に stop_hook_active を見る)
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const input = JSON.parse(Buffer.concat(chunks).toString() || '{}')

if (input.stop_hook_active || !existsSync('node_modules')) process.exit(0)

const result = spawnSync('pnpm', ['typecheck'], { encoding: 'utf8', shell: true })
if (result.status !== 0) {
  console.error(
    `pnpm typecheck が失敗しました。修正してください。\n${result.stdout}${result.stderr}`,
  )
  process.exit(2)
}
