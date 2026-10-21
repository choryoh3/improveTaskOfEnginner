import { CalendarCheck, Code2, FileText, Gauge, ListChecks, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** `g` のあとに押すキー(例: g → t で Today) */
  key: string
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Today', icon: CalendarCheck, key: 't' },
  { href: '/overview', label: 'Overview', icon: Gauge, key: 'o' },
  { href: '/tasks', label: 'タスク', icon: ListChecks, key: 'a' },
  { href: '/reports', label: '日報・レビュー', icon: FileText, key: 'r' },
  { href: '/snippets', label: 'ナレッジ', icon: Code2, key: 's' },
]

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘/Ctrl', 'K'], label: 'コマンドパレットを開く' },
  { keys: ['C'], label: 'タスクをすばやく追加' },
  { keys: ['F'], label: 'フォーカスの開始 / 終了' },
  { keys: ['?'], label: 'ショートカット一覧' },
  ...NAV_ITEMS.map((item) => ({
    keys: ['G', item.key.toUpperCase()],
    label: `${item.label} へ移動`,
  })),
  { keys: ['⌘/Ctrl', 'Enter'], label: 'フォームを送信' },
]
