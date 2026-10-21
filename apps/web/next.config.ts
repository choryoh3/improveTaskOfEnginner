import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ワークスペースの TypeScript ソースをそのまま取り込む
  transpilePackages: ['@app/api', '@app/db', '@app/shared'],
  // ネイティブモジュールはバンドルしない
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
  turbopack: { root: path.join(import.meta.dirname, '../..') },
}

export default nextConfig
