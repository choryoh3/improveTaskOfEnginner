---
paths: ['apps/web/**']
---

# Frontend ルール

- App Router。サーバーコンポーネントを既定とし、状態やイベントが必要な箇所だけ `'use client'`。
- API 呼び出しは Hono の `hc` クライアント経由(型安全)。サーバー状態は TanStack Query で管理する。
- 変更系は楽観的更新 + 失敗時ロールバック + トースト。
- UI は shadcn/ui を拡張して使う。独自スタイルはデザイントークン(CSS 変数)経由。
- フォームの検証は `packages/shared` の zod スキーマを再利用する。
