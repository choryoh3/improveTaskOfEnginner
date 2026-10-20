---
name: new-api-route
description: Hono の API ルートを追加する手順。新しいエンドポイントやリソースを作るときに使う。
---

# new-api-route

1. `packages/shared` に zod スキーマ(入力・出力)を追加する。
2. `packages/db` のリポジトリ層に、`userId` 必須のメソッドを追加する。
3. `packages/api/src/services/` に業務ロジックを書く。
4. `packages/api/src/routes/` にルートを追加し、`@hono/zod-validator` で入力検証する。
5. ルート型が `hc` クライアントに公開されることを確認する。
6. 統合テスト(SQLite)を書く。認可テスト(他ユーザーは 404)を必ず含める。
7. `pnpm typecheck && pnpm lint && pnpm test` を通す。
