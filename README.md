# improveTaskOfEnginner

エンジニアの日々の業務を**俯瞰して管理**し、タスク・集中・日報・ナレッジの摩擦を減らす Web アプリです。
「毎日開きたくなる、俯瞰とキーボード操作に強いコックピット」を目指しています。

## できること

| 画面               | 内容                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Today**          | 今日やること、今日の集中時間、「次にやること」を 1 件提示。その場でタスクを追加              |
| **Overview**       | 領域(プロジェクト)ごとの進捗、今週の負荷、期限切れ・ブロック中、7 日分の集中時間             |
| **タスク**         | 検索・絞り込み、ドラッグでの並べ替え、見積もり・期限・優先度・タグ                           |
| **日報・レビュー** | 完了したタスクと集中時間から、日報と週次レビューを Markdown で自動生成。ワンクリックでコピー |
| **ナレッジ**       | コマンドやメモを保存して検索。コードブロックにコピーボタン                                   |
| **フォーカス**     | ポモドーロ。タスクに紐づけて時間を記録                                                       |

### キーボード操作

`⌘/Ctrl + K` でコマンドパレット(文字を入力して Enter でタスクを追加)。
`C` タスク追加 / `F` フォーカスの開始・終了 / `?` ショートカット一覧 / `G` → `T` `O` `A` `R` `S` で画面移動。

## 技術スタック

Next.js (App Router) + TypeScript(strict)・Tailwind CSS 4・TanStack Query / Hono(API。Next.js の Route Handler に同居)・zod(Front と API でスキーマを共有)/
Prisma 7・SQLite(開発)/ Supabase Postgres(本番)/ Supabase Auth / pnpm モノレポ・Vitest・Playwright / GitHub Actions・Vercel

```
apps/web         Next.js(画面 + /api の Hono エントリ)
packages/api     Hono アプリ(routes / middleware / services)
packages/db      Prisma・DB 切替・リポジトリ層(全クエリに userId)
packages/shared  zod スキーマ・共通型(Front/API の契約)
packages/config  tsconfig の共有設定
e2e              Playwright(スモーク + 通しテスト)
docs             architecture / deploy / roadmap
.claude          Claude Code 用の設定(rules / skills / agents / hooks)
```

依存の向きは `apps/web → packages/api → packages/db / packages/shared` で、逆向きは禁止です。
設計の詳細は [docs/architecture.md](docs/architecture.md) を参照してください。

## はじめかた(ローカル開発)

必要なもの: Node.js 22 以上、pnpm 10、Supabase のプロジェクト(無料プランで可)。

```bash
pnpm install
```

### 1. 環境変数

`apps/web/.env.local` を作ります(Git には入りません)。ひな形は [.env.example](.env.example) です。

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DB_TARGET=sqlite
SQLITE_DATABASE_URL=file:<このリポジトリの絶対パス>/packages/db/dev.db
APP_TZ_OFFSET_MIN=540
```

- `SQLITE_DATABASE_URL` は**絶対パス**にしてください。相対パスだと、実行する場所ごとに別の DB ファイルができます。
- Supabase の「Authentication → Sign In / Providers → Email → Confirm email」を OFF にすると、確認メールなしで登録できて手軽です(開発用)。
- `NEXT_PUBLIC_` の変数はブラウザに公開されます。秘密の値には使わないでください。

### 2. データベース

```bash
pnpm db:setup   # Prisma クライアントの生成 + SQLite へのマイグレーション適用
```

### 3. 起動

```bash
pnpm dev        # 3000 番が使用中なら、次の空きポート(3001 など)で起動します
```

## コマンド

| コマンド         | 内容                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev`       | 開発サーバー                                                                        |
| `pnpm build`     | Prisma クライアントの生成 + 本番ビルド                                              |
| `pnpm typecheck` | 型チェック(全パッケージ)                                                            |
| `pnpm lint`      | ESLint                                                                              |
| `pnpm test`      | ユニット・統合テスト(Vitest。SQLite を一時作成して実行)                             |
| `pnpm test:e2e`  | E2E(Playwright)。先に `pnpm build` が必要。通しテストは下記の資格情報があるときだけ |
| `pnpm db:gen`    | `schema.base.prisma` から SQLite / Postgres 用のスキーマとクライアントを生成        |

通しテストを動かすには、**テスト専用のアカウント**を用意して実行します。

```bash
E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
```

## デプロイ

Vercel + Supabase を想定しています。手順と注意点は [docs/deploy.md](docs/deploy.md) にまとめています。

## フィードバック・要望

不具合の報告や「こうなってほしい」は、[Issues](../../issues) で歓迎します。テンプレートがあります。
今後の拡張案は [docs/roadmap.md](docs/roadmap.md) です。

## Claude Code で開発する場合

方針は [CLAUDE.md](CLAUDE.md) に、領域別のルール・手順・専門担当は `.claude/` に分けて置いています。
