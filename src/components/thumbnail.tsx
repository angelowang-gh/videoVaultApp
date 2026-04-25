import { useState, useEffect } from 'react'
import { generateThumbnail, getCachedThumbnail, onThumbnailInvalidated } from '@/lib/thumbnail'
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