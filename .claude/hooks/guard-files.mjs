// PreToolUse: .env* と lockfile の直接編集をブロックする(exit 2 でツール実行を拒否)
import { basename } from 'node:path'

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const input = JSON.parse(Buffer.concat(chunks).toString() || '{}')
const file = input.tool_input?.file_path ?? ''
const name = basename(file)

const isEnv = name === '.env' || (name.startsWith('.env.') && name !== '.env.example')
const isLock = name === 'pnpm-lock.yaml'

if (isEnv || isLock) {
  console.error(`${name} は直接編集できません(.env* は手動管理、lockfile は pnpm 経由で更新)。`)
  process.exit(2)
}
