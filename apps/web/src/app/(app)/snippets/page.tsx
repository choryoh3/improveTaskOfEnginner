import type { Metadata } from 'next'
import { SnippetsView } from './snippets-view'

export const metadata: Metadata = { title: 'ナレッジ' }

export default function SnippetsPage() {
  return <SnippetsView />
}
