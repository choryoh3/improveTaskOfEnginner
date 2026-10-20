# Context

ユーザーは「improveTaskOfEnginner」を Claude Code に実装させるための最強プロンプトを求めている。前版から DB 方針が「local=PostgreSQL」から「local=SQLite、本番=Supabase(PostgreSQL)、環境で切替可能」に変わり、アプリの目的も「業務を俯瞰して管理できる」が加わった。成果物はコード変更ではなく、貼り付け用の改善版プロンプト(下記)。

# 前版からの変更点

1. DB: SQLite(dev)/Supabase Postgres(prod)の切替設計を追加。落とし穴(Prisma は provider 固定、Vercel で SQLite 不可、型差異)を明記。
2. 俯瞰機能: 領域/プロジェクト単位のオーバービューと週次レビューを MVP に追加。
3. 認可: SQLite には RLS がないため、userId 条件は Hono/service 層で強制(本番のみ RLS を多層防御)。

# 改善版プロンプト(これを提示する)

````markdown
# ミッション

エンジニア(自分)の日々の業務を**俯瞰して管理**でき、タスク・集中・日報・ナレッジの摩擦を減らす Web アプリ **improveTaskOfEnginner**(アプリ名=リポジトリ名)を、設計から MVP まで実装してください。
作業環境は Windows 11 / PowerShell です。パス区切りとシェル構文に注意してください。

## 0. 進め方の原則

- 各フェーズ開始時に短い計画を示し、終了時に検証結果(型チェック・lint・テスト・画面確認)を報告する。
- 迷う点は推奨案で進め、最後にまとめて報告する。質問は「ユーザーしか決められないこと」だけにする。
- ライブラリのバージョンと API は実装前に公式ドキュメントか MCP で最新を確認する。記憶で書かない(Next.js / Prisma / Hono / shadcn/ui / Tailwind / TanStack Query / Supabase SSR)。
- 秘密情報はコミットしない。`.env*` は gitignore し、`.env.example` のみ置く。実キーは `.env.local` に置く。
- 外部に影響する操作の前に確認する: GitHub リポジトリ作成と初回 push、Supabase 本番へのマイグレーション適用、依存の大量追加。Vercel デプロイはユーザーが手動で行うので、手順書 `docs/deploy.md` だけ用意する。

## 1. 技術スタック(固定)

- Frontend: Next.js (App Router) + TypeScript(strict) + Tailwind CSS + shadcn/ui + TanStack Query
- Backend: Hono(`@hono/zod-validator`、型安全な RPC クライアント `hc`)。Next.js の Route Handler(`app/api/[[...route]]/route.ts`、`hono/vercel`)に載せ、Front と同一 Vercel プロジェクトで動かす。
- ORM: Prisma / バリデーション: zod。スキーマは `packages/shared` に置き、Front と API で共有する。
- 認証: Supabase Auth(`@supabase/ssr`、自作しない)。認可は Hono ミドルウェアで JWT を検証し、`userId` をコンテキストに載せる。
- Hosting: GitHub + Vercel。
- Lint/Format: ESLint(flat config)+ Prettier(最小構成)。
- Package manager: pnpm(モノレポ)。
- Test: Vitest。E2E は Playwright MCP での画面確認を基本とし、CI 用 Playwright はスモーク 1〜2 本のみ。
- CI: GitHub Actions(型チェック、ESLint、Vitest、Playwright スモーク)。`main` / `develop` への push と、同ブランチ宛て pull_request で実行。最小構成。

## 2. DB 切替設計(重要)

要件: 開発は SQLite、本番は Supabase(PostgreSQL)。環境変数 `DB_TARGET=sqlite|postgres` で切り替える。

前提となる制約:

- Prisma の `provider` は schema ごとに固定で、実行時には切り替えられない。
- Vercel のサーバーレスでは SQLite を永続化できない。**本番は必ず Supabase** にする。SQLite は local / CI 専用。
- SQLite と PostgreSQL では型の扱いが違う(enum、配列、Json、Decimal、日時精度など)。

採用方針(推奨):

1. **単一の schema テンプレート**(`packages/db/prisma/schema.base.prisma`)から、`schema.sqlite.prisma` と `schema.postgres.prisma` を生成するスクリプト(`pnpm db:gen`)を作る。差分は `datasource` の provider/url だけにする。
2. モデルは**両 DB で互換な型だけ**を使う: enum は使わず `String` + zod で検証、配列は使わず中間テーブルにする、Json は使わない、ID は `String @default(cuid())`。
3. Prisma クライアントは DB ごとに別 output へ生成し、`packages/db/src/client.ts` が `DB_TARGET` で適切な方を返すファクトリを提供する。アプリ側は `getDb()` のみを使う。
4. マイグレーションは provider ごとに分ける(`migrations/sqlite`、`migrations/postgres`)。Postgres の本番適用は確認後に行う。
5. Postgres は実行時にプーラー(`DATABASE_URL`)、マイグレーションに直結(`DIRECT_URL`)を使う。
6. **認可の二重化**: SQLite には RLS がないため、全クエリに `userId` 条件を強制する共通関数/Prisma extension を `packages/db` に実装し、リポジトリ層でのみ DB を触る。本番ではさらに RLS を有効化する(Prisma は RLS をバイパスするため、あくまで多層防御)。
7. 両 DB で同じ統合テストが通ることを CI で確認する(SQLite は常時、Postgres は任意ジョブ)。
8. SQLite 利用時は Supabase Auth の JWT が使えない場面に備え、ローカルでも Supabase Auth(開発用プロジェクト)を使う前提にする。

## 3. アプリの機能(MVP)

「毎日開きたくなる、俯瞰とキーボード操作に強いエンジニアのコックピット」。

1. **Overview(俯瞰)**: 領域/プロジェクト別の進捗、今週の負荷、期限切れ/ブロック中、集中時間の推移を 1 画面で表示する。
2. **Today**: 今日のタスク、集中時間、次にやること 1 件。
3. **タスク管理**: 作成/編集/完了/並べ替え。領域・優先度・タグ・見積もり・期限。楽観的更新。
4. **クイックキャプチャ + コマンドパレット(⌘/Ctrl+K)**: どの画面でも 1 秒で追加・移動・操作。
5. **フォーカスタイマー**: ポモドーロ。タスクに紐づけて集中時間を記録する。
6. **日報/スタンドアップ/週次レビュー自動生成**: 完了タスクと集中時間から生成し、ワンクリックでコピー。
7. **スニペット/ナレッジ**: コマンドやメモを保存して検索。コードブロックにコピーボタン。

MVP の外には出ない。拡張案は `docs/roadmap.md` に書くだけにする。

## 4. リポジトリ構成(pnpm workspace)

```
improveTaskOfEnginner/
├─ apps/web/            # Next.js(UI + app/api の Hono エントリ)
├─ packages/api/        # Hono アプリ本体(routes / middleware / services)
├─ packages/db/         # Prisma テンプレート・生成スクリプト・クライアントファクトリ・リポジトリ層
├─ packages/shared/     # zod スキーマ・共通型・定数
├─ packages/config/     # tsconfig / eslint 共有設定
├─ .claude/             # settings.json / rules / skills / agents
├─ .github/workflows/ci.yml
├─ docs/                # architecture.md / deploy.md / roadmap.md
├─ CLAUDE.md            # 100行以内
├─ .mcp.json            # playwright(登録済み)、supabase など
└─ .env.example
```

依存方向は `apps/web → packages/api → packages/db / packages/shared`。逆向き依存は禁止。

## 5. Claude 関連リソース(.claude)

- **CLAUDE.md は 100 行以内**(概要、コマンド、アーキテクチャ原則、絶対ルールのみ)。詳細は `.claude/rules/*`(frontend / api / db / testing / ui)に分ける。
- **settings.json**:
  - permissions: `pnpm *`、`git status/diff/log`、`gh pr *` など読み取り中心を許可。`.env*` の読み書き、`rm -rf`、`git push --force` は拒否。
  - hooks: PostToolUse で Prettier、PreToolUse で `.env*` と lockfile の直接編集をブロック、Stop で `pnpm typecheck`。
- **skills**: new-api-route / new-page / db-migrate(両 provider 対応)/ verify-ui。
- **agents**: frontend-dev / api-dev / db-dev / reviewer(読み取り専用)/ ui-verifier(Playwright MCP)。
- **MCP**: Playwright(登録済み)、Supabase MCP(読み取り・型生成中心。本番書き込みは確認必須)、公式ドキュメント系 MCP。

## 6. 並列実装(ハーネス)

- 先に**契約**(zod スキーマ、Hono ルート型、リポジトリ層のインターフェース)を `packages/shared` と `packages/db` で確定する。
- 契約確定後、`packages/db`、`packages/api`、`apps/web` の UI を、サブエージェントまたは `git worktree` で並列化する。
- 統合担当(メインのあなた)が最後にマージし、`pnpm typecheck && pnpm lint && pnpm test` を通す。

## 7. UI/UX 方針

- デザイントークン(色・余白・角丸・影・モーション)。ライト/ダーク両対応、システム設定に追従。
- shadcn/ui をベースに、タイポグラフィ(Inter + 日本語フォント)と余白を丁寧に整える。
- マイクロインタラクションは控えめに(`prefers-reduced-motion` を尊重)。
- スケルトン、空状態、エラー状態、トーストを全画面に用意し、完了時の満足感を設計する。
- キーボード操作を一級市民にする(`?` でショートカット一覧)。
- アクセシビリティ: コントラスト AA 以上、フォーカスリング、ARIA。レスポンシブ対応。
- 実装後に Playwright MCP で主要画面のスクリーンショットを撮り、自己批評して改善する(最低 2 周)。

## 8. フェーズ

1. 基盤: ローカル git 初期化、モノレポ、共通設定、CLAUDE.md、.claude 一式、CI。`gh repo create choryoh3/improveTaskOfEnginner --public` は確認後。
2. データ/契約: schema テンプレートと生成スクリプト、クライアントファクトリ、zod スキーマ、Supabase Auth 接続、RLS の SQL。
3. API: Hono ルート、認可ミドルウェア、リポジトリ層、Vitest(SQLite で統合テスト)。
4. UI: レイアウト、認証画面、MVP 7 機能、コマンドパレット。
5. 仕上げ: UI 検証 2 周、Playwright スモーク、`docs/deploy.md`(Vercel 環境変数と `DB_TARGET=postgres` 設定)、README。

## 9. 完了条件(DoD)

- `pnpm typecheck` / `lint` / `test` / `build` がすべて成功する。
- `DB_TARGET=sqlite` で「サインアップ → タスク作成 → フォーカス → 日報生成」が通る(Playwright MCP)。
- `DB_TARGET=postgres`(Supabase 開発プロジェクト)でも同じ統合テストが通る。
- 他ユーザーのデータにアクセスできないことを API 統合テストで確認する。
- CI が `main` / `develop` の push と PR で緑になる。
- 秘密情報がリポジトリ内にない(最終スキャン)。
- CLAUDE.md が 100 行以内で、詳細が rules/skills/agents に分離されている。

まずフェーズ 1 の計画を提示して着手してください。
````

# Verification

- 実装は行わない。ユーザーがプロンプトを Claude Code に貼って実行する。
- 確認観点: DB 切替(§2)が Prisma の provider 固定制約と矛盾しないこと、DoD が検証可能であること。
