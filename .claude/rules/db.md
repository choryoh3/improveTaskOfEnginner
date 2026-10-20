---
paths: ['packages/db/**']
---

# DB ルール

- schema の原本は `schema.base.prisma` のみ。`schema.sqlite.prisma` / `schema.postgres.prisma` は `pnpm db:gen` の生成物(手編集禁止)。
- 型は両 DB 互換のみ: enum / 配列 / Json 禁止。ID は `String @default(cuid())`。
- 全テーブルに `userId` を持たせ、リポジトリ層で全クエリに `userId` 条件を強制する。
- マイグレーションは provider ごとに分ける。Postgres(本番)への適用は必ず事前確認。
- Postgres は実行時 `DATABASE_URL`(プーラー)、マイグレーション `DIRECT_URL`(直結)。
- 本番テーブルは RLS を有効化する(Prisma は RLS をバイパスするため多層防御)。
