import type * as React from 'react'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-lg border border-input bg-card px-3 text-sm shadow-soft transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive'

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(field, 'h-9', className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(field, 'min-h-20 py-2 leading-relaxed', className)} {...props} />
}

/** ネイティブ <select>。モバイルでも使いやすく、アクセシビリティもそのまま得られる。 */
function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(field, 'h-9 cursor-pointer pr-8', className)} {...props} />
}

export { Input, Select, Textarea }
