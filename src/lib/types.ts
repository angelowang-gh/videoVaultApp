export type Resolution = '4K' | '2K' | '1080p' | '720p' | '480p' | 'other'
export type Orientation = 'landscape' | 'portrait' | 'square'
export type Rating = 0 | 1 | 2 | 3 | 4 | 5
export type DurationCategory = '<1min' | '1-5min' | '5-10min' | '10-30min' | '30-60min' | '>60min'

export interface VideoMeta {
  width?: number
  height?: number
  resolution?: Resolution
  orientation?: Orientation
  duration?: number
  durationCategory?: DurationCategory
  rating: Rating
  country: string
  scene: string
  person: string
}

export interface VideoFile {
  id: string
  name: string
  path: string
  size: number
  extension: string
  lastModified: number
  tagIds: string[]
  meta: VideoMeta
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface AppData {
  tags: Tag[]
  videoTags: Record<string, string[]>
  videoMeta: Record<string, VideoMeta>
  countries: string[]
  scenes: string[]
  persons: string[]
  scanPaths: string[]
}

export interface ScanResult {
  videos: VideoFile[]
  total: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export function classifyResolution(w: number, h: number): Resolution {
  const longer = Math.max(w, h)
  if (longer >= 3840) return '4K'
  if (longer >= 2560) return '2K'
  if (longer >= 1920) return '1080p'
  if (longer >= 1280) return '720p'
  if (longer >= 640) return '480p'
  return 'other'
}

export function classifyOrientation(w: number, h: number): Orientation {
  if (w > h) return 'landscape'
  if (h > w) return 'portrait'
  return 'square'
}

export function classifyDuration(seconds: number): DurationCategory {
  const minutes = seconds / 60
  if (minutes < 1) return '<1min'
  if (minutes < 5) return '1-5min'
  if (minutes < 10) return '5-10min'
  if (minutes < 30) return '10-30min'
  if (minutes < 60) return '30-60min'
  return '>60min'
}

export const RESOLUTION_OPTIONS: Resolution[] = ['4K', '2K', '1080p', '720p', '480p', 'other']
export const ORIENTATION_OPTIONS: Orientation[] = ['landscape', 'portrait', 'square']
export const DURATION_OPTIONS: DurationCategory[] = ['<1min', '1-5min', '5-10min', '10-30min', '30-60min', '>60min']

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  landscape: 'Landscape',
  portrait: 'Portrait',
  square: 'Square',
}

export const DURATION_LABELS: Record<DurationCategory, string> = {
  '<1min': '< 1 min',
  '1-5min': '1 - 5 min',
  '5-10min': '5 - 10 min',
  '10-30min': '10 - 30 min',
  '30-60min': '30 - 60 min',
  '>60min': '> 60 min',
}

export const DEFAULT_COUNTRIES = [
  'China', 'USA', 'Japan', 'Korea', 'UK', 'France', 'Germany', 'India', 'Thailand', 'Other',
]

export const DEFAULT_SCENES = [
  'Daily', 'Travel', 'Sports', 'Music', 'Tutorial', 'Gaming', 'Food', 'Nature', 'City', 'Other',
]

export const DEFAULT_PERSONS = [
  'Other',
]

export type SortField = 'default' | 'duration' | 'size' | 'date' | 'rating'
export type SortDirection = 'asc' | 'desc'

export const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'duration', label: 'Duration' },
  { value: 'size', label: 'File Size' },
  { value: 'date', label: 'Date' },
  { value: 'rating', label: 'Rating' },
]
