# アーキテクチャ

## 構成

```
apps/web  →  packages/api  →  packages/db / packages/shared
```

- `packages/shared`: zod スキーマ・共通型(Front/API の契約)
- `packages/db`: Prisma、`getDb()`、リポジトリ層(全クエリに `userId` 必須)
- `packages/api`: Hono(Next.js の Route Handler に同居)
- 認証は Supabase Auth、認可は Hono ミドルウェア

## DB 切替

`DB_TARGET=sqlite|postgres`。開発は SQLite、本番は Supabase Postgres。
Prisma の provider は固定のため、`schema.base.prisma` から provider 別 schema を生成する(フェーズ 2 で実装)。
Vercel では SQLite を使えないため、本番は必ず Postgres。
