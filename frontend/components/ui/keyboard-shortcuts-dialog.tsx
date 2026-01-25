"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { Badge } from "./badge"

interface Shortcut {
  keys: string[]
  description: string
}

const SHORTCUTS: Shortcut[] = [
  {
    keys: ["Alt", "D"],
    description: "Go to Dashboard",
  },
  {
    keys: ["Alt", "C"],
    description: "Go to Customers",
  },
  {
    keys: ["Alt", "R"],
    description: "Go to Risk Analysis",
  },
  {
    keys: ["Alt", "F"],
    description: "Go to Funnel",
  },
  {
    keys: ["Alt", "A"],
    description: "Go to Actions",
  },
  {
    keys: ["Alt", "S"],
    description: "Go to Simulator",
  },
  {
    keys: ["Ctrl", "/"],
    description: "Show this help",
  },
]

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleShowShortcuts = () => setOpen(true)
    window.addEventListener('show-shortcuts' as any, handleShowShortcuts)
    return () => window.removeEventListener('show-shortcuts' as any, handleShowShortcuts)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate the app quickly
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {SHORTCUTS.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <Badge key={key} variant="secondary" className="font-mono text-xs">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
