import { getVideoStreamUrl, getThumbnailUrl, uploadThumbnail } from './api'
import { classifyResolution, classifyOrientation, classifyDuration } from './types'
import type { Resolution, Orientation, DurationCategory } from './types'

export interface ThumbnailResult {
  url: string | null
  width?: number
  height?: number
  resolution?: Resolution
  orientation?: Orientation
  duration?: number
  durationCategory?: DurationCategory
}

interface DetectedMeta {
  width: number
  height: number
  resolution: Resolution
  orientation: Orientation
  duration?: number
  durationCategory?: DurationCategory
}

// In-memory cache to avoid re-generating
const thumbCache = new Map<string, string>()
// Track failed IDs to avoid retrying
const failedIds = new Set<string>()
// Track in-flight generation to avoid duplicates
const generating = new Map<string, Promise<ThumbnailResult>>()
// Concurrency control: max 3 simultaneous generations
let activeCount = 0
const MAX_CONCURRENT = 3
const queue: Array<{ videoId: string; resolve: (v: ThumbnailResult) => void }> = []

// Store detected dimensions for batch upload
const detectedDimensions = new Map<string, DetectedMeta>()
let dimensionFlushTimer: ReturnType<typeof setTimeout> | null = null

export function getCachedThumbnail(videoId: string): string | null {
  return thumbCache.get(videoId) ?? null
}

/** 清除指定视频的缩略图缓存（例如用户选取了新封面后调用） */
export function invalidateThumbnailCache(videoId: string): void {
  const url = thumbCache.get(videoId)
  if (url) {
    URL.revokeObjectURL(url)
    thumbCache.delete(videoId)
  }
  failedIds.delete(videoId)
  // 通知订阅者该缩略图已失效
  thumbInvalidationListeners.forEach(cb => cb(videoId))
}

// 缩略图失效监听器（用于 Thumbnail 组件实时更新）
const thumbInvalidationListeners = new Set<(videoId: string) => void>()

export function onThumbnailInvalidated(cb: (videoId: string) => void): () => void {
  thumbInvalidationListeners.add(cb)
  return () => { thumbInvalidationListeners.delete(cb) }
}

// Flush detected dimensions to a callback and clear the buffer
export function flushDetectedDimensions(): Record<string, DetectedMeta> {
  const result: Record<string, DetectedMeta> = {}
  for (const [id, dims] of detectedDimensions) {
    result[id] = dims
  }
  detectedDimensions.clear()
  return result
}

// Set up a periodic flush that calls a callback with accumulated dimension data
let flushCallback: ((updates: Record<string, DetectedMeta>) => void) | null = null

export function setDimensionFlushCallback(cb: (updates: Record<string, DetectedMeta>) => void) {
  flushCallback = cb
  // Start periodic flush
  if (dimensionFlushTimer) clearInterval(dimensionFlushTimer)
  dimensionFlushTimer = setInterval(() => {
    if (detectedDimensions.size > 0 && flushCallback) {
      const data = flushDetectedDimensions()
      flushCallback(data)
    }
  }, 3000) // Flush every 3 seconds
}

export async function generateThumbnail(videoId: string): Promise<string | null> {
  if (thumbCache.has(videoId)) return thumbCache.get(videoId)!
  if (failedIds.has(videoId)) return null

  const existing = generating.get(videoId)
  if (existing) return existing.then(r => r.url)

  const promise = new Promise<ThumbnailResult>((resolve) => {
    if (activeCount < MAX_CONCURRENT) {
      activeCount++
      runGenerate(videoId).then(resolve)
    } else {
      queue.push({ videoId, resolve })
    }
  })

  generating.set(videoId, promise)
  promise.finally(() => generating.delete(videoId))
  return promise.then(r => r.url)
}

function processQueue() {
  while (queue.length > 0 && activeCount < MAX_CONCURRENT) {
    const next = queue.shift()!
    activeCount++
    runGenerate(next.videoId).then(next.resolve)
  }
}

async function runGenerate(videoId: string): Promise<ThumbnailResult> {
  try {
    const result = await doGenerate(videoId)
    if (!result.url) failedIds.add(videoId)
    return result
  } catch {
    failedIds.add(videoId)
    return { url: null }
  } finally {
    activeCount--
    processQueue()
  }
}

async function doGenerate(videoId: string): Promise<ThumbnailResult> {
  // Check server cache (HEAD request to avoid noisy 404 bodies)
  // Use cache: 'no-cache' to avoid stale browser HTTP cache after cover update
  try {
    const res = await fetch(getThumbnailUrl(videoId), { method: 'HEAD', cache: 'no-cache' })
    if (res.ok) {
      const imgRes = await fetch(getThumbnailUrl(videoId), { cache: 'no-cache' })
      const blob = await imgRes.blob()
      const url = URL.createObjectURL(blob)
      thumbCache.set(videoId, url)
      // We don't know dimensions from cached thumbnail, return url only
      return { url }
    }
  } catch {
    // Not on server
  }

  // Generate client-side using video + canvas
  try {
    const captureResult = await captureVideoFrame(getVideoStreamUrl(videoId))
    if (captureResult.dataUrl) {
      const blob = dataUrlToBlob(captureResult.dataUrl)
      const url = URL.createObjectURL(blob)
      thumbCache.set(videoId, url)
      // Persist to server in background
      uploadThumbnail(videoId, captureResult.dataUrl).catch(() => {})

      // Store detected dimensions + duration for batch meta update
      if (captureResult.width && captureResult.height) {
        const resolution = classifyResolution(captureResult.width, captureResult.height)
        const orientation = classifyOrientation(captureResult.width, captureResult.height)
        const meta: DetectedMeta = {
          width: captureResult.width,
          height: captureResult.height,
          resolution,
          orientation,
        }
        if (captureResult.duration && isFinite(captureResult.duration)) {
          meta.duration = captureResult.duration
          meta.durationCategory = classifyDuration(captureResult.duration)
        }
        detectedDimensions.set(videoId, meta)
      }

      return {
        url,
        width: captureResult.width,
        height: captureResult.height,
        resolution: captureResult.width && captureResult.height
          ? classifyResolution(captureResult.width, captureResult.height) : undefined,
        orientation: captureResult.width && captureResult.height
          ? classifyOrientation(captureResult.width, captureResult.height) : undefined,
        duration: captureResult.duration,
        durationCategory: captureResult.duration && isFinite(captureResult.duration)
          ? classifyDuration(captureResult.duration) : undefined,
      }
    }
  } catch {
    // Unsupported format
  }

  return { url: null }
}

interface CaptureResult {
  dataUrl: string | null
  width?: number
  height?: number
  duration?: number
}

function captureVideoFrame(src: string): Promise<CaptureResult> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.preload = 'metadata'

    let done = false
    let videoDuration: number | undefined
    const finish = (result: CaptureResult) => {
      if (done) return
      done = true
      clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      resolve(result)
    }

    const timer = setTimeout(() => finish({ dataUrl: null }), 8000)

    video.addEventListener('loadedmetadata', () => {
      videoDuration = video.duration
      const seekTime = Math.min(video.duration * 0.25, 3)
      video.currentTime = seekTime
    })

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas')
        const w = video.videoWidth
        const h = video.videoHeight
        const scale = Math.min(1, 320 / w)
        canvas.width = Math.round(w * scale)
        canvas.height = Math.round(h * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          finish({
            dataUrl: canvas.toDataURL('image/jpeg', 0.7),
            width: w,
            height: h,
            duration: videoDuration,
          })
        } else {
          finish({ dataUrl: null })
        }
      } catch {
        finish({ dataUrl: null })
      }
    })

    video.addEventListener('error', () => finish({ dataUrl: null }))
    video.src = src
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const b64 = atob(parts[1])
  const arr = new Uint8Array(b64.length)
  for (let i = 0; i < b64.length; i++) {
    arr[i] = b64.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}

/**
 * 仅提取视频时长（不生成缩略图）
 * 比完整缩略图生成更快，只获取元数据
 */
export async function extractVideoDuration(videoId: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.preload = 'metadata'

    let done = false
    const finish = (duration: number | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      resolve(duration)
    }

    const timer = setTimeout(() => finish(null), 5000)

    video.addEventListener('loadedmetadata', () => {
      if (video.duration && isFinite(video.duration)) {
        finish(video.duration)
      } else {
        finish(null)
      }
    })

    video.addEventListener('error', () => finish(null))
    
    // 使用视频流URL
    video.src = getVideoStreamUrl(videoId)
  })
}
