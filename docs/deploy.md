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

#### 公開前に決めること(新規登録をどうするか)

Confirm email が OFF のままだと、登録画面を知っている人は、メールアドレスの持ち主かどうかの確認なしに登録できる。
他人のアドレスで先に登録される「なりすまし登録」も防げない。デプロイして URL を公開する前に、次のどちらかを選ぶ。

| 方針                   | 設定                                                  | 向いている場合                                            |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| 新規登録を閉じる       | Authentication の「Allow new users to sign up」を OFF | 自分専用。**自分のアカウントを作成したあとに OFF にする** |
| 確認メールを有効にする | Confirm email を ON にし、SMTP(Resend など)を設定する | 不特定多数に使ってもらう                                  |

**現在の設定(2026-10-22 時点)**: Confirm email は **ON**。登録済みのアカウントは確認済みなので、そのままログインできる。

- ON のとき、新規登録では確認メールが送られ、リンクを開くまでログインできない(登録画面には「確認メールを送信しました」と出る)。
- 標準のメール送信は 1 時間に数通までなので、**公開するなら SMTP の設定が必要**(上限に達すると登録画面に「メールの送信回数の上限に達しました」と出る)。
- 確認リンクは、**登録したときと同じブラウザで開く**のが確実。別の端末で開くと、自動ログインされず `/login` に戻される。確認自体は、リンクを開いた時点で完了しているので、その場合はパスワードでログインすればよい。
- 確認メールのリンクが `/auth/callback` に戻れるよう、Redirect URLs に本番とローカルの URL が必要(上の表のとおり)。

新規登録を閉じると、登録画面には「現在、新規登録は受け付けていません。」と表示される(エラーコード `signup_disabled`)。
登録済みのアカウントでのログインは、そのまま使える。

### 1-2. 接続文字列

**取得方法**: Supabase のプロジェクト画面の上部にある **Connect** ボタンを押し、
Connection String の方式(Method)で **Transaction pooler** を選ぶ。

| 環境変数       | 使う接続                        | 用途                                |
| -------------- | ------------------------------- | ----------------------------------- |
| `DATABASE_URL` | Transaction pooler(ポート 6543) | アプリの実行時(Vercel)              |
| `DIRECT_URL`   | Direct / Session pooler         | マイグレーション作成などの CLI 作業 |

Transaction pooler の形式は、次のとおり。

```
postgres://postgres.<project-ref>:[YOUR-PASSWORD]@aws-<region>.pooler.supabase.com:6543/postgres
```

- ユーザー名は `postgres` ではなく **`postgres.<project-ref>`**(ドット区切り)。画面の文字列をそのままコピーすれば間違えない。
- `[YOUR-PASSWORD]` は、プロジェクト作成時に決めた**データベースのパスワード**に置き換える(ログイン用のパスワードとは別物)。
  忘れた場合は、プロジェクトの Database 設定から再設定できる。
- パスワードに `@` `:` `/` `#` `?` `%` などの記号が入っていると、**URL エンコードが必要**(例: `@` → `%40`)。接続エラーの定番の原因。
- サーバーレスでは接続数が増えやすいので、実行時はプーラー経由にする。
  Shared pooler は IPv4 で接続できる。Direct(`db.<project-ref>.supabase.co`)は IPv6 で、IPv4 のみの環境(Vercel や GitHub Actions など)からは、アドオン無しでは繋がらない。
- Transaction mode は**プリペアドステートメントに対応しない**(Supabase のドキュメントの注意)。
  このアプリの接続(`@prisma/adapter-pg`)では、ローカルから `DB_TARGET=postgres` で接続し、
  `select 1` とタスクの追加(引数つきの INSERT)が成功することを確認済み(2026-10-22)。
  `prepared statement ... does not exist` のようなエラーが出たら、Session pooler(ポート 5432)に切り替えて切り分ける。
- **`.env.local` に書くとき**: Next.js は値の中の `$名前` を変数として展開する(二重引用符で囲んでも同じ)。
  パスワードに `$` を含めると、その後ろが消えて認証に失敗する。**英数字だけのパスワードにする**のが確実
  (どうしても使うなら `\$` とエスケープする)。Vercel の環境変数では展開されない。
- 環境変数を変えたら、**dev サーバーを止めて起動し直す**。DB への接続は、最初の 1 回で使い回される。

> 接続文字列にはパスワードが入っている。チャットや Issue に貼らず、`apps/web/.env.local` や Vercel の環境変数(Sensitive)にだけ書く。

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

### 1-4. 接続のトラブルシューティング

| 症状                                                                 | 原因と対処                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `password authentication failed for user "postgres"`(コード `28P01`) | **DB のパスワードが合っていない**。エラー文のユーザー名が `postgres` なのは、プーラーが `postgres.<project-ref>` の `.<project-ref>` を省いて表示するため。ユーザー名の誤りではない。確認する順: ①ログイン用ではなく **DB のパスワード**か ②再設定の直後なら数分待つ(プーラーに反映されるまで) ③`[` `]` が残っていないか ④記号は URL エンコード済みか(`$` は上記の展開に注意) |
| `Tenant or user not found`                                           | ユーザー名が `postgres.<project-ref>` ではなく `postgres` になっている、またはリージョンのホストが違う場合に出ることがある。**Connect** ボタンの文字列を、そのままコピーし直す                                                                                                                                                                                                |
| `prepared statement ... does not exist`                              | Transaction pooler の制約。Session pooler(ポート 5432)に切り替える                                                                                                                                                                                                                                                                                                            |
| タイムアウト・接続できない(Direct を使っている場合)                  | Direct は IPv6。IPv4 のみの環境では Shared pooler を使う                                                                                                                                                                                                                                                                                                                      |

**`/api/health/db` の使い方**

- 開発中(`pnpm dev`)に 503 になると、応答に、アプリが受け取った接続先(ユーザー名・ホスト・ポート・DB 名、パスワードの**文字数**など)が付く。
  パスワードそのものは出ない。本物のパスワードの文字数と照らすと、`$` の展開などで欠けていないかが分かる。
- **本番(`NODE_ENV=production`)では、成功時も失敗時も `ok` `db` `target` だけ**で、接続先の情報は返さない。原因は Vercel の Functions ログで見る。

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
2. `https://<your-domain>/api/health/db` が `{"ok":true,"db":"up","target":"postgres"}` を返す(Vercel から Postgres に接続できている)。
   503 の場合は、Vercel の Functions ログで原因を見る(`DATABASE_URL` の値・パスワード、`DB_TARGET` を確認)。
3. 未ログインで `/` を開くと `/login` に移動する。
4. ログインして、タスクの追加・完了・削除ができる。新規登録を閉じた場合は、登録済みのアカウントでログインする。
5. Supabase の Table Editor で、`Task` に行が入っている(Vercel が Postgres に書けている)。

通しテストを本番に向けて流す場合は、専用のテストアカウントを用意し、
`E2E_EMAIL` / `E2E_PASSWORD` を設定して `pnpm test:e2e` を実行する(`playwright.config.ts` の `baseURL` に注意)。

## 3. 検証の状況

**確認済み(2026-10-22)**

- ローカル(`DB_TARGET=postgres`)から、本番の Supabase Postgres に Transaction pooler 経由で接続できる(`/api/health/db`)。
- Supabase Auth でのログイン(新規登録を含む)と、タスクの追加が通る(`Task` に行が入り、持ち主が実在するユーザーであることを確認)。
- マイグレーション 2 本の適用と、RLS・権限の状態(7 テーブルが RLS 有効、`anon` / `authenticated` の権限なし)。

**未検証(初回は慎重に進めること)**

- Vercel 上でのビルドと実行(`vercel.json` のコマンド、モノレポの取り込み設定)。
- Postgres 上での、タスクの完了・削除など、追加以外の操作(ブラウザでの確認は実施予定)。
- Postgres に対する自動テスト(統合テストは SQLite のみ)。
