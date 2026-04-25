import { useApp } from '@/lib/store'
import { getVideoStreamUrl, uploadThumbnail } from '@/lib/api'
import { invalidateThumbnailCache } from '@/lib/thumbnail'
import { formatFileSize, formatDuration } from '@/lib/utils'
import { ORIENTATION_LABELS, DURATION_LABELS } from '@/lib/types'
import type { Rating } from '@/lib/types'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Tag, Star, Monitor, Smartphone, Globe, Clapperboard, Users, Timer, ChevronDown, Image as ImageIcon, Check, Loader2, X, ZoomIn } from 'lucide-react'
import { Button } from './ui/button'
import { TagBadge } from './tag-badge'
import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

/* ── Confirmation dialog ── */
function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-card-hover animate-scale-in">
        <p className="text-sm text-foreground mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  )
}

function useConfirm() {
  const [state, setState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null)

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>(resolve => {
      setState({ message, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state?.resolve(true)
    setState(null)
  }, [state])

  const handleCancel = useCallback(() => {
    state?.resolve(false)
    setState(null)
  }, [state])

  const dialog = (
    <ConfirmDialog
      open={!!state}
      message={state?.message || ''}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, dialog }
}

/* ── Video Player Page ── */
export function VideoPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { videos, tags, updateVideoTags, updateVideoMeta, countries, scenes, persons, loading } = useApp()
  const video = videos.find(v => v.id === id)
  const { confirm, dialog } = useConfirm()

  const videoRef = useRef<HTMLVideoElement>(null)

  // 封面选取相关状态
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [coverScreenshots, setCoverScreenshots] = useState<string[]>([])
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [coverApplied, setCoverApplied] = useState(false)
  const [videoScale, setVideoScale] = useState<number>(0) // 0 = 自适应
  const [showScaleMenu, setShowScaleMenu] = useState(false)

  const SCALE_OPTIONS = [
    { label: '自适应', value: 0 },
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框中不拦截
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const el = videoRef.current
      if (!el) return
      if (e.key === ' ') {
        e.preventDefault()
        if (el.paused) {
          el.play()
        } else {
          el.pause()
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        el.currentTime = Math.max(0, el.currentTime - 5)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 5)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 从当前视频中截取10张截图
  const captureScreenshots = useCallback(async () => {
    if (!video) return
    
    setIsCapturing(true)
    setCoverScreenshots([])
    setSelectedCoverIndex(null)
    setShowCoverPicker(true)
    
    const screenshots: string[] = []
    const vid = document.createElement('video')
    vid.crossOrigin = 'anonymous'
    vid.muted = true
    vid.preload = 'auto'
    vid.src = getVideoStreamUrl(video.id)
    
    try {
      await new Promise<void>((resolve, reject) => {
        vid.onloadedmetadata = () => resolve()
        vid.onerror = () => reject(new Error('Video load failed'))
        setTimeout(() => reject(new Error('Timeout')), 15000)
      })
      
      const videoDuration = vid.duration
      if (!videoDuration || !isFinite(videoDuration)) {
        setIsCapturing(false)
        return
      }
      
      const step = videoDuration / 11
      for (let i = 1; i <= 10; i++) {
        const seekTime = step * i
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Seek timeout')), 5000)
            vid.onseeked = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                const w = vid.videoWidth
                const h = vid.videoHeight
                const scale = Math.min(1, 400 / Math.max(w, h))
                canvas.width = Math.round(w * scale)
                canvas.height = Math.round(h * scale)
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
                  resolve(canvas.toDataURL('image/jpeg', 0.8))
                } else {
                  reject(new Error('Canvas context failed'))
                }
              } catch (e) {
                reject(e)
              }
            }
            vid.currentTime = seekTime
          })
          screenshots.push(dataUrl)
        } catch {
          // skip
        }
      }
    } catch (error) {
      console.error('截取封面失败:', error)
    } finally {
      vid.removeAttribute('src')
      vid.load()
      setCoverScreenshots(screenshots)
      setIsCapturing(false)
    }
  }, [video])

  // 确认选择封面
  const applyCover = useCallback(async () => {
    if (selectedCoverIndex === null || !coverScreenshots[selectedCoverIndex] || !video) return
    
    const coverDataUrl = coverScreenshots[selectedCoverIndex]
    
    // 上传封面到服务器
    try {
      await uploadThumbnail(video.id, coverDataUrl)
      // 清除客户端缩略图缓存，使主页面刷新后获取新封面
      invalidateThumbnailCache(video.id)
    } catch (err) {
      console.error('上传封面失败:', err)
    }
    
    // 通过 postMessage 通知主窗口实时更新
    if (window.opener) {
      window.opener.postMessage({
        type: 'video-cover-update',
        videoId: video.id,
        coverDataUrl
      }, '*')
    }
    setCoverApplied(true)
    setTimeout(() => setCoverApplied(false), 2000)
  }, [selectedCoverIndex, coverScreenshots, video])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full gradient-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <p className="text-sm text-muted-foreground mb-4">Video not found</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </div>
    )
  }

  const videoTags = tags.filter(t => video.tagIds.includes(t.id))
  const availableTags = tags.filter(t => !video.tagIds.includes(t.id))

  const handleAddTag = async (tagId: string) => {
    const tag = tags.find(t => t.id === tagId)
    const ok = await confirm(`Add tag "${tag?.name}" to this video?`)
    if (!ok) return
    await updateVideoTags(video.id, [...video.tagIds, tagId])
  }

  const handleRemoveTag = async (tagId: string) => {
    const tag = tags.find(t => t.id === tagId)
    const ok = await confirm(`Remove tag "${tag?.name}" from this video?`)
    if (!ok) return
    await updateVideoTags(video.id, video.tagIds.filter(id => id !== tagId))
  }

  const handleSetRating = async (rating: Rating) => {
    await updateVideoMeta(video.id, { rating })
  }

  const handleSetCountry = async (country: string) => {
    await updateVideoMeta(video.id, { country })
  }

  const handleSetScene = async (scene: string) => {
    await updateVideoMeta(video.id, { scene })
  }

  const handleSetPerson = async (person: string) => {
    await updateVideoMeta(video.id, { person })
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => window.close()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {/* 左侧：视频标题 */}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground truncate">{video.name}</h2>
        </div>
        {/* 右侧：视频参数 */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <span>{formatFileSize(video.size)}</span>
          <span>{video.extension.toUpperCase()}</span>
          <span>{new Date(video.lastModified).toLocaleDateString()}</span>
          {video.meta.resolution && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {video.meta.resolution}
            </span>
          )}
          {video.meta.orientation && (
            <span className="flex items-center gap-0.5">
              {video.meta.orientation === 'portrait' ? (
                <Smartphone className="h-3 w-3" />
              ) : (
                <Monitor className="h-3 w-3" />
              )}
              {ORIENTATION_LABELS[video.meta.orientation]}
            </span>
          )}
          {video.meta.width && video.meta.height && (
            <span>{video.meta.width}x{video.meta.height}</span>
          )}
          {(video.meta.duration && video.meta.duration > 0) || video.meta.durationCategory ? (
            <span className="flex items-center gap-0.5">
              <Timer className="h-3 w-3" />
              {video.meta.duration && video.meta.duration > 0 
                ? formatDuration(video.meta.duration)
                : video.meta.durationCategory 
                  ? DURATION_LABELS[video.meta.durationCategory]
                  : ''}
            </span>
          ) : null}
        </div>
      </div>

      {/* Video */}
      <div className="flex-1 bg-black flex items-center justify-center min-h-0 relative overflow-auto">
        <video
          ref={videoRef}
          key={video.id}
          controls
          autoPlay
          style={videoScale > 0 ? { width: `${videoScale * 100}%`, maxWidth: 'none' } : { width: '100%', height: '100%' }}
          className={videoScale === 0 ? "object-contain" : ""}
          src={getVideoStreamUrl(video.id)}
        >
          Your browser does not support the video tag.
        </video>
        {/* 缩放控制 */}
        <div className="absolute bottom-3 right-3 z-10">
          <div className="relative">
            <button
              onClick={() => setShowScaleMenu(!showScaleMenu)}
              className="h-7 px-2.5 rounded-md bg-black/70 hover:bg-black/90 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm transition-colors"
              title="画幅缩放"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              {videoScale === 0 ? '自适应' : `${videoScale}x`}
            </button>
            {showScaleMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowScaleMenu(false)} />
                <div className="absolute bottom-full right-0 z-50 mb-1 w-28 rounded-lg border border-border bg-popover p-1 shadow-lg animate-scale-in">
                  {SCALE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setVideoScale(opt.value); setShowScaleMenu(false) }}
                      className={cn(
                        "flex w-full items-center rounded-md px-2.5 py-1.5 text-xs transition-smooth",
                        videoScale === opt.value
                          ? "bg-primary/15 text-primary font-medium"
                          : "text-foreground hover:bg-surface-hover"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom panel: metadata + tags */}
      <div className="border-t border-border px-5 py-3 space-y-3 shrink-0">
        {/* Rating + Country + Scene + Person row */}
        <div className="flex items-center gap-6 flex-wrap">
          {/* Star Rating */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rating:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => handleSetRating((video.meta.rating === i ? 0 : i) as Rating)}
                  className="p-0.5 transition-smooth hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-4 w-4 transition-smooth",
                      i <= video.meta.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40 hover:text-yellow-400/60"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Country */}
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <MetaSelect
              value={video.meta.country}
              options={countries}
              placeholder="Country"
              onChange={handleSetCountry}
            />
          </div>

          {/* Scene */}
          <div className="flex items-center gap-2">
            <Clapperboard className="h-3.5 w-3.5 text-muted-foreground" />
            <MetaSelect
              value={video.meta.scene}
              options={scenes}
              placeholder="Scene"
              onChange={handleSetScene}
            />
          </div>

          {/* Person */}
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <MetaSelect
              value={video.meta.person}
              options={persons}
              placeholder="Person"
              onChange={handleSetPerson}
            />
          </div>
        </div>

        {/* Tags + 封面选取 合并行 */}
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {videoTags.map(tag => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                color={tag.color}
                size="md"
                removable
                onRemove={() => handleRemoveTag(tag.id)}
              />
            ))}
            {availableTags.length > 0 && (
              <AddTagDropdown availableTags={availableTags} onAdd={handleAddTag} />
            )}
            {videoTags.length === 0 && availableTags.length === 0 && (
              <span className="text-xs text-muted-foreground">No tags available</span>
            )}
          </div>
          {/* 选取封面按钮 - 居右 */}
          <div className="flex items-center gap-2 shrink-0">
            {coverApplied && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                封面已应用
              </span>
            )}
            {!showCoverPicker ? (
              <button
                onClick={captureScreenshots}
                disabled={isCapturing}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-smooth"
              >
                {isCapturing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImageIcon className="h-3 w-3" />
                )}
                选取封面
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowCoverPicker(false)
                  setCoverScreenshots([])
                  setSelectedCoverIndex(null)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-hover transition-smooth"
              >
                <X className="h-3 w-3" />
                关闭
              </button>
            )}
          </div>
        </div>

        {/* 封面截图选择面板 */}
        {showCoverPicker && (
          <div className="border border-border/50 rounded-lg p-3 bg-surface/50">
            {isCapturing ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在截取视频截图...
              </div>
            ) : coverScreenshots.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                截图失败，请重试
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {coverScreenshots.map((screenshot, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedCoverIndex(index)}
                      className={cn(
                        "relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:opacity-90 aspect-video",
                        selectedCoverIndex === index
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-border"
                      )}
                    >
                      <img
                        src={screenshot}
                        alt={`截图 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedCoverIndex === index && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedCoverIndex !== null && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      已选择第 {selectedCoverIndex + 1} 张
                    </div>
                    <button
                      onClick={applyCover}
                      className="h-7 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="h-3 w-3" />
                      确认为封面
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {dialog}
    </div>
  )
}

function MetaSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string
  options: string[]
  placeholder: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs transition-smooth hover:border-primary",
          value ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value || placeholder}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-1 max-h-48 w-36 overflow-y-auto scrollbar-thin rounded-lg border border-border bg-popover p-1 shadow-card-hover animate-scale-in">
            {/* Clear option */}
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-hover transition-smooth"
            >
              -- Clear --
            </button>
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-1.5 text-xs hover:bg-surface-hover transition-smooth",
                  opt === value ? "text-primary font-medium" : "text-foreground"
                )}
              >
                {opt}
              </button>
            ))}
            {options.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                Add options in Settings
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function AddTagDropdown({ availableTags, onAdd }: { availableTags: Array<{ id: string; name: string; color: string }>; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-smooth"
      >
        + Add Tag
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-44 rounded-lg border border-border bg-popover p-1.5 shadow-card-hover animate-scale-in">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => { onAdd(tag.id); setOpen(false) }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover transition-smooth"
              >
                <TagBadge name={tag.name} color={tag.color} size="sm" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
