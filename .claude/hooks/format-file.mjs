// PostToolUse: 編集したファイルに Prettier を適用する(失敗しても作業は止めない)
import { spawnSync } from 'node:child_process'

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)
const input = JSON.parse(Buffer.concat(chunks).toString() || '{}')
const file = input.tool_input?.file_path

if (file && /\.(tsx?|jsx?|mjs|cjs|json|css|md|ya?ml)$/.test(file)) {
  spawnSync('pnpm', ['exec', 'prettier', '--write', '--log-level', 'silent', file], {
    stdio: 'ignore',
    shell: true,
  })
}
