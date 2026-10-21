import { cn } from '@/lib/utils'

/** ロゴマーク: 上昇する 3 本のバー(生産性の向上)を、角丸のタイルに載せたもの */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('size-8 shrink-0', className)}
      fill="none"
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <rect x="8" y="17" width="4" height="7" rx="2" fill="white" fillOpacity="0.55" />
      <rect x="14" y="12" width="4" height="12" rx="2" fill="white" fillOpacity="0.8" />
      <rect x="20" y="7" width="4" height="17" rx="2" fill="white" />
    </svg>
  )
}
