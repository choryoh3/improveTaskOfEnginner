'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export interface CaptureDefaults {
  title?: string
  areaId?: string | null
}

interface UiContextValue {
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  captureOpen: boolean
  captureDefaults: CaptureDefaults
  openCapture: (defaults?: CaptureDefaults) => void
  closeCapture: () => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
  areasOpen: boolean
  setAreasOpen: (open: boolean) => void
  focusOpen: boolean
  focusTaskId: string | null
  openFocus: (taskId?: string | null) => void
  closeFocus: () => void
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureDefaults, setCaptureDefaults] = useState<CaptureDefaults>({})
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [areasOpen, setAreasOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)

  const value = useMemo<UiContextValue>(
    () => ({
      paletteOpen,
      setPaletteOpen,
      captureOpen,
      captureDefaults,
      openCapture: (defaults = {}) => {
        setCaptureDefaults(defaults)
        setCaptureOpen(true)
      },
      closeCapture: () => setCaptureOpen(false),
      shortcutsOpen,
      setShortcutsOpen,
      areasOpen,
      setAreasOpen,
      focusOpen,
      focusTaskId,
      openFocus: (taskId = null) => {
        setFocusTaskId(taskId)
        setFocusOpen(true)
      },
      closeFocus: () => setFocusOpen(false),
    }),
    [paletteOpen, captureOpen, captureDefaults, shortcutsOpen, areasOpen, focusOpen, focusTaskId],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const value = useContext(UiContext)
  if (!value) throw new Error('useUi は UiProvider の内側で使ってください')
  return value
}
