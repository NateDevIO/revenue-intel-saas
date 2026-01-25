import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  action: () => void
  description: string
}

export const APP_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'd',
    alt: true,
    action: () => {},
    description: 'Go to Dashboard',
  },
  {
    key: 'c',
    alt: true,
    action: () => {},
    description: 'Go to Customers',
  },
  {
    key: 'r',
    alt: true,
    action: () => {},
    description: 'Go to Risk Analysis',
  },
  {
    key: 'f',
    alt: true,
    action: () => {},
    description: 'Go to Funnel',
  },
  {
    key: 'a',
    alt: true,
    action: () => {},
    description: 'Go to Actions',
  },
  {
    key: 's',
    alt: true,
    action: () => {},
    description: 'Go to Simulator',
  },
  {
    key: '/',
    ctrl: true,
    action: () => {},
    description: 'Show keyboard shortcuts',
  },
]

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Navigation shortcuts (Alt + key)
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault()
            router.push('/')
            break
          case 'c':
            e.preventDefault()
            router.push('/customers')
            break
          case 'r':
            e.preventDefault()
            router.push('/risk')
            break
          case 'f':
            e.preventDefault()
            router.push('/funnel')
            break
          case 'a':
            e.preventDefault()
            router.push('/actions')
            break
          case 's':
            e.preventDefault()
            router.push('/simulator')
            break
        }
      }

      // Show shortcuts help (Ctrl + /)
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        // Dispatch custom event to show shortcuts modal
        window.dispatchEvent(new CustomEvent('show-shortcuts'))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [router])
}
