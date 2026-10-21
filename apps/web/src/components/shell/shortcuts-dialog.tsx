'use client'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/misc'
import { SHORTCUTS } from './nav'
import { useUi } from './ui-context'

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useUi()
  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent aria-describedby="shortcuts-description" className="max-w-md">
        <div className="space-y-1">
          <DialogTitle>キーボードショートカット</DialogTitle>
          <DialogDescription id="shortcuts-description">
            入力欄を操作していないときに使えます。
          </DialogDescription>
        </div>
        <ul className="grid gap-1">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              <span>{shortcut.label}</span>
              <span className="flex items-center gap-1">
                {shortcut.keys.map((key, index) => (
                  <span key={key} className="flex items-center gap-1">
                    {index > 0 && <span className="text-xs text-muted-foreground">→</span>}
                    <Kbd>{key}</Kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
