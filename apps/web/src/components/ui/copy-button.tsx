'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** クリップボードにコピーし、しばらくチェックマークを見せる */
export function CopyButton({
  text,
  label = 'コピー',
  size = 'sm',
  variant = 'outline',
  iconOnly = false,
}: {
  text: string
  label?: string
  size?: 'sm' | 'default' | 'icon-sm'
  variant?: 'outline' | 'ghost' | 'default'
  iconOnly?: boolean
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('クリップボードにコピーしました')
    } catch {
      toast.error('コピーできませんでした。ブラウザの権限を確認してください')
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? 'icon-sm' : size}
      onClick={copy}
      aria-label={iconOnly ? label : undefined}
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      {!iconOnly && (copied ? 'コピー済み' : label)}
    </Button>
  )
}
