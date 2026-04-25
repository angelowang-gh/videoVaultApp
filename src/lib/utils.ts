import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const TAG_COLORS = [
  { name: 'red', var: '--tag-red' },
  { name: 'orange', var: '--tag-orange' },
  { name: 'yellow', var: '--tag-yellow' },
  { name: 'green', var: '--tag-green' },
  { name: 'teal', var: '--tag-teal' },
  { name: 'blue', var: '--tag-blue' },
  { name: 'indigo', var: '--tag-indigo' },
  { name: 'purple', var: '--tag-purple' },
  { name: 'pink', var: '--tag-pink' },
] as const

export type TagColor = typeof TAG_COLORS[number]['name']