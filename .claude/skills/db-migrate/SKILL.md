---
name: db-migrate
description: Prisma schema 変更とマイグレーション(SQLite/Postgres 両対応)の手順。モデルを変更するときに使う。
---

# db-migrate

1. `packages/db/prisma/schema.base.prisma` だけを編集する(両 DB 互換の型のみ)。
2. `pnpm db:gen` で provider 別 schema とクライアントを生成する。
3. SQLite: 開発用マイグレーションを作成・適用し、統合テストを通す。
4. Postgres: マイグレーションを生成して内容をユーザーに見せる。**本番への適用は確認を取ってから**行う(Supabase MCP または DIRECT_URL)。
5. 新規テーブルには `userId` と、本番用 RLS ポリシーの SQL を用意する。
6. `pnpm typecheck && pnpm test` を通す。
