---
name: new-page
description: Next.js App Router のページを追加する手順。新しい画面を作るときに使う。
---

# new-page

1. `apps/web/app/` にルートを追加する(サーバーコンポーネントを既定)。
2. データ取得は `hc` クライアント + TanStack Query。ローディング(スケルトン)・空・エラー状態を作る。
3. UI は shadcn/ui とデザイントークンで組む。キーボード操作とアクセシビリティを確認する。
4. コマンドパレットに、画面への移動コマンドを登録する。
5. `/verify-ui` で画面を確認する。
