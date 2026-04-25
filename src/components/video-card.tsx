import { useState } from 'react'
import { useApp } from '@/lib/store'
import { formatFileSize, formatDuration } from '@/lib/utils'
import type { VideoFile } from '@/lib/types'
import { ORIENTATION_LABELS, DURATION_LABELS } from '@/lib/types'
import { Play, Tag, Clock, HardDrive, Star, Monitor, Smartphone, Timer, ExternalLink, Maximize2, PlusCircle } from 'lucide-react'
import { TagBadge } from './tag-badge'
import { cn } from '@/lib/utils'
import { Thumbnail } from './thumbnail'

interface VideoCardProps {
  video: VideoFile
  onAddToPlaylist?: (video: VideoFile) => void
}

function MiniStars({ rating }: { rating: number }) {
  if (rating === 0) return null
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  )
}

export function VideoCard({ video, onAddToPlaylist }: VideoCardProps) {
  const { tags } = useApp()
  const [showTagMenu, setShowTagMenu] = useState(false)
  const videoTags = tags.filter(t => video.tagIds.includes(t.id))

  const playerUrl = `/video/${video.id}`

  const handleOpenInPopup = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const width = Math.min(1200, window.screen.width * 0.9)
    const height = Math.min(800, window.screen.height * 0.9)
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    window.open(
      playerUrl,
      `video-${video.id}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`
    )
  }

  // 拖拽开始处理
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('videoId', video.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  // 添加到播放列表
  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onAddToPlaylist) {
      onAddToPlaylist(video)
    }
  }

  return (
    <div 
      className="group relative rounded-lg border border-border bg-card overflow-hidden shadow-card hover:shadow-card-hover transition-smooth animate-fade-in cursor-move"
      draggable="true"
      onDragStart={handleDragStart}
      title="拖拽到下方播放列表区域添加"
    >
      {/* Thumbnail container */}
      <div className="relative block aspect-video bg-surface cursor-pointer overflow-hidden">
        {/* 静态缩略图 */}
        <Thumbnail videoId={video.id} className="group-hover:scale-105 transition-transform duration-300 ease-out" />

        {/* Play overlay with click to open popup */}
        <div 
          className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/40 transition-smooth cursor-pointer"
          onClick={handleOpenInPopup}
          title="点击开窗播放视频"
        >
          <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-smooth shadow-glow">
            <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
          </div>
        </div>

        {/* Top badges row */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
          <div className="flex gap-1">
            {video.meta.resolution && (
              <span className="rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground backdrop-blur-sm">
                {video.meta.resolution}
              </span>
            )}
            {video.meta.orientation && (
              <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm flex items-center gap-0.5">
                {video.meta.orientation === 'portrait' ? (
                  <Smartphone className="h-2.5 w-2.5" />
                ) : (
                  <Monitor className="h-2.5 w-2.5" />
                )}
                {ORIENTATION_LABELS[video.meta.orientation]}
              </span>
            )}
          </div>
          <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            {video.extension}
          </span>
        </div>
        {/* Duration badge bottom-right */}
        <div className="absolute bottom-2 right-2 pointer-events-none">
          {video.meta.duration && video.meta.duration > 0 ? (
            <span className="rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm flex items-center gap-0.5">
              <Timer className="h-2.5 w-2.5" />
              {formatDuration(video.meta.duration)}
            </span>
          ) : video.meta.durationCategory ? (
            <span className="rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm flex items-center gap-0.5">
              <Timer className="h-2.5 w-2.5" />
              {DURATION_LABELS[video.meta.durationCategory]}
            </span>
          ) : (
            <span className="rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 backdrop-blur-sm flex items-center gap-0.5 italic">
              <Timer className="h-2.5 w-2.5" />
              未提取
            </span>
          )}
        </div>
        
        {/* Play buttons bottom-left */}
        <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
          <button
            onClick={handleOpenInPopup}
            className="rounded-md bg-background/90 px-2 py-1.5 text-[10px] font-medium text-foreground hover:bg-background hover:text-primary backdrop-blur-sm flex items-center gap-1 transition-smooth hover:scale-105"
            title="开窗播放"
          >
            <Maximize2 className="h-3 w-3" />
            开窗
          </button>
          <a
            href={playerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-background/90 px-2 py-1.5 text-[10px] font-medium text-foreground hover:bg-background hover:text-primary backdrop-blur-sm flex items-center gap-1 transition-smooth hover:scale-105 no-underline"
            title="新标签页播放"
          >
            <ExternalLink className="h-3 w-3" />
            新页
          </a>
          {onAddToPlaylist && (
            <button
              onClick={handleAddToPlaylist}
              className="rounded-md bg-background/90 px-2 py-1.5 text-[10px] font-medium text-foreground hover:bg-background hover:text-primary backdrop-blur-sm flex items-center gap-1 transition-smooth hover:scale-105"
              title="添加到播放列表"
            >
              <PlusCircle className="h-3 w-3" />
              添加
            </button>
          )}
        </div>
      </div>



      {/* Info */}
      <div className="p-2">
        <div className="flex items-start justify-between gap-1">
          <div className="text-xs font-medium text-foreground line-clamp-1" title={video.name}>
            {video.name}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowTagMenu(!showTagMenu)}
              className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-smooth"
            >
              <Tag className="h-3.5 w-3.5" />
            </button>
            {showTagMenu && (
              <TagDropdown video={video} onClose={() => setShowTagMenu(false)} />
            )}
          </div>
        </div>

        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {formatFileSize(video.size)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(video.lastModified).toLocaleDateString()}
          </span>
        </div>

        {/* Star rating */}
        {video.meta.rating > 0 && (
          <div className="mt-1">
            <MiniStars rating={video.meta.rating} />
          </div>
        )}

        {/* Meta labels (country / scene / person) */}
        {(video.meta.country || video.meta.scene || video.meta.person) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {video.meta.country && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                {video.meta.country}
              </span>
            )}
            {video.meta.scene && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                {video.meta.scene}
              </span>
            )}
            {video.meta.person && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                {video.meta.person}
              </span>
            )}
          </div>
        )}

        {videoTags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {videoTags.map(tag => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function VideoListItem({ video, onAddToPlaylist }: VideoCardProps) {
  const { tags } = useApp()
  const [showTagMenu, setShowTagMenu] = useState(false)
  const videoTags = tags.filter(t => video.tagIds.includes(t.id))

  const playerUrl = `/video/${video.id}`

  // 拖拽开始处理
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('videoId', video.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  // 添加到播放列表
  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onAddToPlaylist) {
      onAddToPlaylist(video)
    }
  }

  const handleOpenInPopup = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const width = Math.min(1200, window.screen.width * 0.9)
    const height = Math.min(800, window.screen.height * 0.9)
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    window.open(
      playerUrl,
      `video-${video.id}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`
    )
  }

  return (
    <div 
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 hover:bg-surface-hover transition-smooth animate-fade-in cursor-move"
      draggable="true"
      onDragStart={handleDragStart}
      title="拖拽到下方播放列表区域添加"
    >
      {/* Mini thumbnail container */}
      <div className="relative block h-16 w-28 shrink-0 rounded-lg bg-surface overflow-hidden cursor-pointer">
        {/* 静态缩略图 */}
        <Thumbnail videoId={video.id} className="rounded-lg" />
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth bg-background/30 cursor-pointer"
          onClick={handleOpenInPopup}
          title="点击开窗播放视频"
        >
          <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center shadow-glow">
            <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" />
          </div>
        </div>
        {/* Badges inside thumbnail */}
        {video.meta.resolution && (
          <div className="absolute top-1 left-1 rounded bg-primary/90 px-1 py-0.5 text-[8px] font-bold text-primary-foreground backdrop-blur-sm">
            {video.meta.resolution}
          </div>
        )}
        <div className="absolute top-1 right-1 rounded bg-background/80 px-1 py-0.5 text-[9px] font-bold uppercase text-muted-foreground backdrop-blur-sm">
          {video.extension}
        </div>
        
        {/* Play buttons overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-smooth flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-1">
            <button
              onClick={handleOpenInPopup}
              className="pointer-events-auto rounded-md bg-background/90 px-2 py-1 text-[9px] font-medium text-foreground hover:bg-background hover:text-primary backdrop-blur-sm flex items-center gap-1 transition-smooth hover:scale-105"
              title="开窗播放"
            >
              <Maximize2 className="h-2.5 w-2.5" />
            </button>
            <a
              href={playerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto rounded-md bg-background/90 px-2 py-1 text-[9px] font-medium text-foreground hover:bg-background hover:text-primary backdrop-blur-sm flex items-center gap-1 transition-smooth hover:scale-105 no-underline"
              title="新标签页播放"
            >
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>



      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground line-clamp-1 block">
          {video.name}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatFileSize(video.size)}</span>
          <span>{new Date(video.lastModified).toLocaleDateString()}</span>
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
          {video.meta.country && <span>{video.meta.country}</span>}
          {video.meta.scene && <span>{video.meta.scene}</span>}
          {video.meta.person && <span>{video.meta.person}</span>}
          {(video.meta.duration && video.meta.duration > 0) || video.meta.durationCategory ? (
            <span className="flex items-center gap-0.5">
              <Timer className="h-3 w-3" />
              {video.meta.duration && video.meta.duration > 0 
                ? formatDuration(video.meta.duration)
                : DURATION_LABELS[video.meta.durationCategory]}
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-muted-foreground/60 italic">
              <Timer className="h-3 w-3" />
              未提取
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <MiniStars rating={video.meta.rating} />
          {videoTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {videoTags.map(tag => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="relative shrink-0">
        <button
          onClick={() => setShowTagMenu(!showTagMenu)}
          className="rounded-md p-2 text-muted-foreground hover:bg-surface hover:text-foreground transition-smooth"
        >
          <Tag className="h-4 w-4" />
        </button>
        {showTagMenu && (
          <TagDropdown video={video} onClose={() => setShowTagMenu(false)} />
        )}
      </div>
    </div>
  )
}

function TagDropdown({ video, onClose }: { video: VideoFile; onClose: () => void }) {
  const { tags, updateVideoTags } = useApp()

  const handleToggleTag = async (tagId: string) => {
    const newTagIds = video.tagIds.includes(tagId)
      ? video.tagIds.filter(id => id !== tagId)
      : [...video.tagIds, tagId]
    await updateVideoTags(video.id, newTagIds)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover p-1.5 shadow-card-hover animate-scale-in">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Assign Tags</p>
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => handleToggleTag(tag.id)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-hover transition-smooth"
          >
            <div className={cn(
              "h-4 w-4 rounded border-2 flex items-center justify-center transition-smooth",
              video.tagIds.includes(tag.id) ? "border-primary bg-primary" : "border-muted-foreground"
            )}>
              {video.tagIds.includes(tag.id) && (
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <TagBadge name={tag.name} color={tag.color} size="sm" />
          </button>
        ))}
        {tags.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground text-center">No tags created yet</p>
        )}
      </div>
    </>
  )
}
