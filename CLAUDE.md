# improveTaskOfEnginner

エンジニア個人の業務を俯瞰・管理し、生産性を上げる Web アプリ(アプリ名=リポジトリ名)。
Windows 11 / PowerShell 環境。応答は日本語。

## スタック

Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui + TanStack Query /
Hono(Next の Route Handler に同居)/ Prisma + zod / Supabase Auth /
DB: dev=SQLite, prod=Supabase Postgres(`DB_TARGET=sqlite|postgres`)/ pnpm monorepo / Vitest / GitHub + Vercel

## コマンド

- `pnpm dev` / `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm format`
- `pnpm test:e2e`(Playwright。先に `pnpm build`)/ `pnpm db:setup`(初回の DB 準備)
- DB 生成・マイグレーションは `/db-migrate` skill に従う
- 環境変数は `apps/web/.env.local` に一本化(Next.js と Prisma CLI の両方がここを読む)

## 構成と依存方向

`apps/web → packages/api → packages/db / packages/shared`(逆向き禁止)。

- `packages/shared`: zod スキーマ・共通型(Front/API の契約)
- `packages/db`: Prisma・クライアントファクトリ `getDb()`・リポジトリ層
- `packages/api`: Hono(routes / middleware / services)
- `packages/config`: tsconfig 共有

## 絶対ルール

1. 秘密情報をコミットしない。`.env*` は読み書きしない(`.env.example` のみ可)。
2. DB アクセスはリポジトリ層のみ。全クエリで `userId` 条件を必須にする。
3. モデルは SQLite/Postgres 両対応の型だけ(enum・配列・Json 禁止)。
4. 入力検証は zod(`@hono/zod-validator`)。スキーマは `packages/shared` に置く。
5. ライブラリの API は実装前に公式ドキュメント/MCP で最新確認(記憶で書かない)。
6. 外部に影響する操作は事前確認: GitHub 作成・push、本番 DB へのマイグレーション。Vercel デプロイはユーザーが手動。
7. 完了報告の前に typecheck / lint / test を通す。UI 変更は Playwright MCP(使えなければ `pnpm test:e2e` や Playwright を直接)で確認する。
8. `src/` を使う構成なので、Next.js の `proxy.ts` は `apps/web/src/` に置く(`apps/web/` 直下だと無視され、認証が効かなくなる)。

## 詳細

- 領域別ルール: `.claude/rules/`(frontend / api / db / testing / ui)
- 手順: `.claude/skills/`、専門担当: `.claude/agents/`
- 仕様・設計メモ: `docs/`(specs=仕様と構成図 / architecture / deploy / roadmap)
- MVP 外の機能は実装せず `docs/roadmap.md` に書く。
