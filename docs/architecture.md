# アーキテクチャ

## 構成

```
apps/web  →  packages/api  →  packages/db / packages/shared
```

- `packages/shared`: zod スキーマ・共通型(Front/API の契約)
- `packages/db`: Prisma、`getDb()`、リポジトリ層(全クエリに `userId` 必須)
- `packages/api`: Hono(Next.js の Route Handler に同居)
- 認証は Supabase Auth(`getClaims()` で JWT 検証)、認可は Hono ミドルウェア + リポジトリ層

## DB 切替

`DB_TARGET=sqlite|postgres`。開発は SQLite、本番は Supabase Postgres。Vercel では SQLite を使えないため、本番は必ず Postgres。

Prisma 7 の制約に合わせた構成:

- schema の原本は `packages/db/prisma/schema.base.prisma` のみ。`pnpm db:gen` が `prisma/generated/schema.<target>.prisma` と、`src/generated/<target>/` のクライアントを生成する(どちらも git 管理外)。
- 接続 URL は `prisma.config.ts` で指定する(`DB_TARGET` で schema・migrations・URL を切替)。`directUrl` は廃止されたため、CLI(マイグレーション)は `DIRECT_URL`、実行時アダプターは `DATABASE_URL`(プーラー)を使う。
- 実行時は `getDb()` がドライバアダプター(better-sqlite3 / pg)を動的 import して `Db` を返す。
- マイグレーションは `prisma/migrations/sqlite` と `prisma/migrations/postgres` に分ける。Postgres 側は `prisma migrate diff` で DB 接続なしに生成する。

### スキーマ変更の手順

1. `schema.base.prisma` を編集
2. `pnpm db:gen`
3. SQLite: `DB_TARGET=sqlite pnpm --filter @app/db migrate:dev`
4. Postgres: `prisma migrate diff --from-schema <旧> --to-schema prisma/generated/schema.postgres.prisma --script` で SQL を作り、`migrations/postgres/<日時>_<名前>/` に置く。**本番への適用は事前確認**

## 認可の層

1. Hono ミドルウェアが JWT を検証して `userId` を確定(401)
2. リポジトリ層が全クエリに `userId` を付与(他人のデータは 404)
3. 本番のみ: RLS 有効化 + `anon`/`authenticated` の権限剥奪(`20261020000001_enable_rls`)。アプリの DB 接続はオーナーロールで RLS をバイパスするため、Data API 経由の直接アクセスを塞ぐ多層防御として機能する

## API(Hono)

- `createApp({ verifyToken, getDb, now, tzOffsetMin })` が依存を引数で受け取る。テストは偽の `verifyToken` と一時 SQLite を渡す。
- ルートはメソッドチェーンで定義し、`App` 型を `hc` クライアントへ公開する(`/api` 配下)。`/api/health` のみ認証不要。
- 認証ミドルウェアが JWT を検証し、`userId` 束縛済みの `repos` をコンテキストに載せる。ハンドラーは `c.var.repos` だけを使い、`userId` を直接扱わない。
- エラーは `{ error: { code, message } }` に統一: 401 `unauthorized` / 404 `not_found`(他ユーザーのデータも 404)/ 400 `validation_error` / 409 `conflict` / 500 `internal_error`。
- エンドポイント: `areas` `tasks` `focus`(`active` `start` `:id/stop`)`snippets` `overview` `reports?type=daily|weekly&date=`

## 既知の制約

- 検索(`q`)の大文字小文字は DB 依存(SQLite の LIKE は ASCII を区別しない、Postgres は区別する)。両 DB 互換のため `mode: 'insensitive'` は使わない。
- 「今日」「今週」は固定オフセット(`APP_TZ_OFFSET_MIN`)で決める。DST のあるタイムゾーンは未対応。
- Postgres 向けの統合テストは未実施(型チェックと SQL 生成まで)。
