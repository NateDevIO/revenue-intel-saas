"use client"

import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts"
import { KeyboardShortcutsDialog } from "@/components/ui/keyboard-shortcuts-dialog"

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts()

  return (
    <>
      {children}
      <KeyboardShortcutsDialog />
    </>
  )
}
