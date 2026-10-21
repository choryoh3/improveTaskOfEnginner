import type { Metadata } from 'next'
import { ReportsView } from './reports-view'

export const metadata: Metadata = { title: '日報・レビュー' }

export default function ReportsPage() {
  return <ReportsView />
}
