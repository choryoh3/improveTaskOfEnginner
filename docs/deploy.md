# デプロイ手順(Vercel + Supabase)

デプロイは手動で行う。この手順書は「何をどの順で設定するか」と「なぜそうするか」をまとめたもの。
**本番 DB へのマイグレーション適用は不可逆なので、必ず内容を確認してから実行する。**

## 0. 全体像

```
ブラウザ ── Vercel(Next.js + Hono /api)── Supabase Postgres(データ)
                    └── Supabase Auth(ログイン)
```

- 本番は必ず Postgres(`DB_TARGET=postgres`)。Vercel のサーバーレスでは SQLite を永続化できない。
- 認証は Supabase Auth。API は Cookie のセッションから取り出した JWT を検証し、`userId` を確定する。

## 1. Supabase

### 1-1. Authentication の設定

| 設定場所                                    | 値                                                                 | 理由                                                              |
| ------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| URL Configuration → Site URL                | 本番の URL(例: `https://xxx.vercel.app`)                           | 確認メールなどのリンクの基準になる                                |
| URL Configuration → Redirect URLs           | `https://xxx.vercel.app/**` と、ローカル用 `http://localhost:*/**` | `/auth/callback` への戻りを許可する(許可リストに無いと拒否される) |
| Sign In / Providers → Email → Confirm email | **公開方針で決める**(下記)                                         | メールアドレスの持ち主かどうかを確認させるか                      |

**Confirm email の選び方**

- ON(推奨): 登録時に確認メールを送る。他人のアドレスでの勝手な登録を防げる。
  Supabase 標準のメール送信は「テスト用で 1 時間に数通」までなので、**本番では SMTP(Resend など)の設定が必要**。
- OFF: すぐにログインできる。手軽だが、アドレスの持ち主かどうかは確認されない。
  自分専用なら、自分のアカウント作成後に「Allow new users to sign up」を OFF にして新規登録を閉じる方法もある。

> この設定は **Supabase プロジェクト全体**に効く。同じプロジェクトを使う別のアプリがあれば、そちらにも影響する。

### 1-2. 接続文字列

Project Settings → Database → Connection string から取得する。

| 環境変数       | 使う接続                        | 用途                                |
| -------------- | ------------------------------- | ----------------------------------- |
| `DATABASE_URL` | Transaction pooler(ポート 6543) | アプリの実行時(Vercel)              |
| `DIRECT_URL`   | Direct / Session pooler         | マイグレーション作成などの CLI 作業 |

サーバーレスでは接続数が増えやすいので、実行時はプーラー経由にする。

### 1-3. マイグレーションの適用(本番 DB)

> **適用前に必ず確認すること**
>
> - 対象の Supabase プロジェクトに、すでに別のテーブルがある場合がある(開発中の確認では `public.user_progress` があった)。
>   このアプリのマイグレーションは `Area` `Task` `Tag` `TaskTag` `FocusSession` `Snippet` `SnippetTag` の 7 テーブルだけを作る・変更する。他のテーブルには触れない。
> - 可能なら、先に Supabase のブランチ(Branching)や別プロジェクトで試す。

このプロジェクトは `prisma migrate deploy` ではなく、**生成済みの SQL を順に適用する**方針にしている。
Prisma は、履歴テーブルの無い「空でない DB」への `migrate deploy` を拒否することがあるため(既存テーブルがある場合に該当)。

`packages/db/prisma/migrations/postgres/` の SQL を、名前の昇順で適用する。

| 順  | ファイル                                  | 内容                                                                                                  |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `20261020000000_init/migration.sql`       | テーブルと制約を作成                                                                                  |
| 2   | `20261020000001_enable_rls/migration.sql` | 7 テーブルの RLS を有効化し、`anon` / `authenticated` の権限を剥奪(Data API 経由の直接アクセスを塞ぐ) |

適用方法(どちらか):

- Supabase ダッシュボードの SQL Editor に、ファイルの中身を貼って実行する。
- Supabase MCP の `apply_migration` で適用する。

適用後の確認:

1. SQL Editor で `select tablename, rowsecurity from pg_tables where schemaname = 'public'` を実行し、7 テーブルの `rowsecurity` が `true` であること。
2. ダッシュボードの Advisors(Security)に、このアプリのテーブルに関する警告が無いこと。
3. 既存テーブル(例: `user_progress`)の件数・RLS が変わっていないこと。

> アプリは Prisma 経由(DB 直結のオーナーロール)で接続するため、RLS をバイパスする。
> データの分離は、API 層とリポジトリ層の `userId` 条件が担う。RLS は多層防御(Data API からの直接アクセス対策)。

#### スキーマを変更したとき

1. `packages/db/prisma/schema.base.prisma` を編集し、`pnpm db:gen`。
2. `prisma migrate diff` で差分 SQL を作り、`migrations/postgres/<日時>_<名前>/migration.sql` に置く(手順は `docs/architecture.md`)。
3. 内容を確認してから、上記と同じ方法で本番へ適用する。

## 2. Vercel

### 2-1. プロジェクト設定

| 項目                                               | 値                                             |
| -------------------------------------------------- | ---------------------------------------------- |
| Root Directory                                     | `apps/web`                                     |
| Include source files outside of the Root Directory | **ON**(モノレポの `packages/*` を取り込むため) |
| Node.js Version                                    | 22.x                                           |
| Install / Build Command                            | `apps/web/vercel.json` に定義済み(上書き不要)  |

`vercel.json` のビルドは `pnpm db:gen`(Prisma クライアントの生成)→ `next build`。生成物は git 管理外なので、ビルドのたびに生成する必要がある。

### 2-2. 環境変数(Production)

| 名前                                   | 値                                  | 備考                                          |
| -------------------------------------- | ----------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co` | 公開してよい値(ブラウザに配られる)            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`                | 公開してよい値。`service_role` キーは入れない |
| `DB_TARGET`                            | `postgres`                          |                                               |
| `DATABASE_URL`                         | Transaction pooler の接続文字列     | パスワードを含む。**Sensitive** にする        |
| `APP_TZ_OFFSET_MIN`                    | `540`                               | 「今日」「今週」の境界(JST)                   |

不要なもの: `DIRECT_URL`(CLI 用)、`SQLITE_DATABASE_URL`(ローカル専用)。

> `NEXT_PUBLIC_` で始まる変数はブラウザに公開される。秘密の値には付けない。

### 2-3. デプロイ後の確認

1. `https://<your-domain>/api/health` が `{"ok":true}` を返す。
2. 未ログインで `/` を開くと `/login` に移動する。
3. 新規登録(または確認メール)→ ログイン → タスク追加ができる。
4. Supabase の Table Editor で、`Task` に行が入っている(Vercel が Postgres に書けている)。

通しテストを本番に向けて流す場合は、専用のテストアカウントを用意し、
`E2E_EMAIL` / `E2E_PASSWORD` を設定して `pnpm test:e2e` を実行する(`playwright.config.ts` の `baseURL` に注意)。

## 3. 未検証の点

この手順のうち、次は実際には試していない。初回は慎重に進めること。

- Vercel 上でのビルドと実行(`vercel.json` のコマンド、モノレポの取り込み設定)。
- Postgres(`DB_TARGET=postgres`)に対するアプリの動作。型チェックと SQL の生成までは確認済みだが、実 DB での統合テストは未実施。
- トランザクションプーラー経由での接続(`@prisma/adapter-pg`)。
