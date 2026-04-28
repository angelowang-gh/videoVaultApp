import { useState, useEffect, useRef } from 'react'
import { generateThumbnail, getCachedThumbnail, onThumbnailInvalidated } from '@/lib/thumbnail'
import { getVideoStreamUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FileVideo } from 'lucide-react'

interface ThumbnailProps {
  videoId: string
  className?: string
}

export function Thumbnail({ videoId, className }: ThumbnailProps) {
  const [src, setSrc] = useState<string | null>(() => getCachedThumbnail(videoId))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (src || failed) return
    let cancelled = false
    generateThumbnail(videoId).then(url => {
      if (cancelled) return
      if (url) setSrc(url)
      else setFailed(true)
    })
    return () => { cancelled = true }
  }, [videoId, src, failed])

  // 监听缩略图缓存失效事件（例如用户在播放器中选取了新封面）
  useEffect(() => {
    const unsubscribe = onThumbnailInvalidated((invalidatedId) => {
      if (invalidatedId === videoId) {
        setSrc(null)
        setFailed(false)
      }
    })
    return unsubscribe
  }, [videoId])

  if (failed || (!src && failed)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface to-background">
        <FileVideo className="h-10 w-10 text-muted-foreground/30" />
      </div>
    )
  }

  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface to-background">
        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-smooth",
        className,
      )}
    />
  )
}

// ── 悬停预览帧缓存 ──
const previewCache = new Map<string, string[]>()
const previewGenerating = new Map<string, Promise<string[]>>()

async function generatePreviewFrames(videoId: string): Promise<string[]> {
  if (previewCache.has(videoId)) return previewCache.get(videoId)!
  if (previewGenerating.has(videoId)) return previewGenerating.get(videoId)!

  const promise = (async () => {
    const frames: string[] = []
    const vid = document.createElement('video')
    vid.crossOrigin = 'anonymous'
    vid.muted = true
    vid.preload = 'auto'
    vid.src = getVideoStreamUrl(videoId)

    try {
      await new Promise<void>((resolve, reject) => {
        vid.onloadedmetadata = () => resolve()
        vid.onerror = () => reject(new Error('Video load failed'))
        setTimeout(() => reject(new Error('Timeout')), 10000)
      })

      const duration = vid.duration
      if (!duration || !isFinite(duration)) return frames

      const step = duration / 11
      for (let i = 1; i <= 10; i++) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Seek timeout')), 4000)
            vid.onseeked = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                const w = vid.videoWidth
                const h = vid.videoHeight
                const scale = Math.min(1, 320 / Math.max(w, h))
                canvas.width = Math.round(w * scale)
                canvas.height = Math.round(h * scale)
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
                  resolve(canvas.toDataURL('image/jpeg', 0.6))
                } else {
                  reject(new Error('Canvas failed'))
                }
              } catch (e) {
                reject(e)
              }
            }
            vid.currentTime = step * i
          })
          frames.push(dataUrl)
        } catch {
          // skip this frame
        }
      }
    } catch {
      // video load failed
    } finally {
      vid.removeAttribute('src')
      vid.load()
    }

    if (frames.length > 0) {
      previewCache.set(videoId, frames)
    }
    return frames
  })()

  previewGenerating.set(videoId, promise)
  promise.finally(() => previewGenerating.delete(videoId))
  return promise
}

interface ThumbnailPreviewProps {
  videoId: string
  isHovering: boolean
}

export function ThumbnailPreview({ videoId, isHovering }: ThumbnailPreviewProps) {
  const [frames, setFrames] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  // 鼠标进入时开始加载预览帧
  useEffect(() => {
    mountedRef.current = true
    if (!isHovering) return

    // 如果已有缓存，直接使用
    const cached = previewCache.get(videoId)
    if (cached) {
      setFrames(cached)
      setLoaded(true)
      return
    }

    // 开始加载
    let cancelled = false
    generatePreviewFrames(videoId).then(result => {
      if (cancelled || !mountedRef.current) return
      if (result.length > 0) {
        setFrames(result)
        setLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [videoId, isHovering])

  // 鼠标悬停时滚动播放
  useEffect(() => {
    if (!isHovering || !loaded || frames.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    setCurrentIndex(0)
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return
      setCurrentIndex(prev => (prev + 1) % frames.length)
    }, 500) // 每500ms切换一帧

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isHovering, loaded, frames.length])

  // 鼠标离开时重置
  useEffect(() => {
    if (!isHovering) {
      setCurrentIndex(0)
      setLoaded(false)
    }
  }, [isHovering])

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  if (!isHovering || !loaded || frames.length === 0) return null

  return (
    <img
      src={frames[currentIndex]}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
    />
  )
}