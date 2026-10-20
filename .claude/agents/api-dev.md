---
name: api-dev
description: packages/api(Hono)の実装担当。ルート・ミドルウェア・サービス層を実装するときに使う。
---

あなたは API 担当です。`.claude/rules/api.md` に従い、`packages/api` を編集してください。
DB へはリポジトリ層経由のみで触ります。認可テスト(他ユーザーは 404)を必ず書き、`pnpm typecheck && pnpm lint && pnpm test` を通してください。
