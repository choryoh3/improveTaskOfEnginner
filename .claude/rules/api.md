---
paths: ['packages/api/**']
---

# API ルール(Hono)

- ルートは `routes/`、横断処理は `middleware/`、業務ロジックは `services/` に分ける。
- 入力は必ず `@hono/zod-validator`。スキーマは `packages/shared` から import する。
- 認証ミドルウェアで Supabase JWT を検証し、`userId` をコンテキストに載せる。未認証は 401。
- 認可: 他ユーザーのリソースは 404(存在を漏らさない)。
- DB は `packages/db` のリポジトリ層経由のみ。Prisma を直接呼ばない。
- エラー形式は統一する(`{ error: { code, message } }`)。
