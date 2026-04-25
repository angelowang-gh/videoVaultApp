import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
let addToastFn: ((message: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (message: string, type: ToastType) => {
      const id = ++toastId
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3500)
    }
    return () => { addToastFn = null }
  }, [])

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map(t => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card-hover animate-slide-in-right",
              t.type === 'success' && "border-l-4 border-l-[hsl(var(--tag-green))]",
              t.type === 'error' && "border-l-4 border-l-destructive",
              t.type === 'info' && "border-l-4 border-l-primary",
            )}
          >
            <Icon className={cn(
              "h-4 w-4 shrink-0",
              t.type === 'success' && "text-[hsl(var(--tag-green))]",
              t.type === 'error' && "text-destructive",
              t.type === 'info' && "text-primary",
            )} />
            <span className="text-sm text-foreground">{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-2 text-muted-foreground hover:text-foreground transition-smooth"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}