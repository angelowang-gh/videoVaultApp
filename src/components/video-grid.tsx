import { useState, useCallback } from 'react'
import { useApp } from '@/lib/store'
import { SORT_OPTIONS } from '@/lib/types'
import type { SortField, VideoFile } from '@/lib/types'
import { VideoCard, VideoListItem } from './video-card'
import { Film, FolderPlus, ArrowUpDown, ArrowUp, ArrowDown, Play, Trash2, Plus, ListVideo, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

export function VideoGrid() {
  const { filteredVideos, viewMode, loading, filters, tags, setShowSettings, scanPaths, sortField, sortDirection, setSortField, setSortDirection } = useApp()
  
  // 自选播放列表状态
  const [playlist, setPlaylist] = useState<VideoFile[]>([])
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  
  // 月份分组展开/收起状态
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  const handleSortChange = (field: SortField) => {
    if (field === sortField && field !== 'default') {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  // 添加视频到播放列表
  const addToPlaylist = useCallback((video: VideoFile) => {
    if (!playlist.some(v => v.id === video.id)) {
      setPlaylist(prev => [...prev, video])
      setIsPlaylistExpanded(true)
    }
  }, [playlist])
  
  // 从播放列表移除视频
  const removeFromPlaylist = useCallback((videoId: string) => {
    setPlaylist(prev => prev.filter(v => v.id !== videoId))
  }, [])
  
  // 清空播放列表
  const clearPlaylist = useCallback(() => {
    setPlaylist([])
  }, [])
  
  // 播放播放列表中的视频（单个视频）
  const playPlaylistVideo = useCallback((video: VideoFile) => {
    const width = Math.min(1200, window.screen.width * 0.9)
    const height = Math.min(800, window.screen.height * 0.9)
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    window.open(
      `/video/${video.id}`,
      `video-${video.id}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`
    )
  }, [])
  
  // 播放整个播放列表
  const playEntirePlaylist = useCallback(() => {
    if (playlist.length === 0) return
    
    // 创建播放列表ID
    const playlistId = `playlist-${Date.now()}`
    // 将播放列表数据保存到sessionStorage
    const playlistData = {
      id: playlistId,
      videos: playlist,
      createdAt: new Date().toISOString()
    }
    sessionStorage.setItem(playlistId, JSON.stringify(playlistData))
    
    const width = Math.min(1400, window.screen.width * 0.95)
    const height = Math.min(900, window.screen.height * 0.95)
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    window.open(
      `/playlist/${playlistId}`,
      `playlist-${playlistId}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`
    )
  }, [playlist])
  
  // 拖放事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    
    try {
      const videoId = e.dataTransfer.getData('videoId')
      if (videoId) {
        const video = filteredVideos.find(v => v.id === videoId)
        if (video) {
          addToPlaylist(video)
        }
      }
    } catch (error) {
      console.error('拖放处理失败:', error)
    }
  }, [filteredVideos, addToPlaylist])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full gradient-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading videos...</p>
        </div>
      </div>
    )
  }

  // Empty state - no scan paths
  if (scanPaths.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-lg animate-fade-in">
          <img
            src="/images/empty-state.png"
            alt="VideoVault illustration"
            className="mx-auto mb-8 w-64 h-48 object-cover rounded-2xl opacity-80"
          />
          <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to VideoVault</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-sm mx-auto">
            Add a video folder to start managing your collection. All supported video formats will be automatically discovered.
          </p>
          <Button onClick={() => setShowSettings(true)} className="h-11 px-6">
            <FolderPlus className="h-4 w-4 mr-2" />
            Add Video Folder
          </Button>
        </div>
      </div>
    )
  }

  // Empty state - no results
  if (filteredVideos.length === 0) {
    const activeFilterTags = tags.filter(t => filters.selectedTagIds.includes(t.id))
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-surface flex items-center justify-center">
            <Film className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">No videos found</h3>
          <p className="text-sm text-muted-foreground">
            {filters.searchQuery
              ? `No results for "${filters.searchQuery}"`
              : activeFilterTags.length > 0
                ? 'No videos match the selected tags'
                : 'No videos found in the scanned folders'}
          </p>
        </div>
      </div>
    )
  }

  // 计算总时长辅助函数
  const calculateTotalDuration = (videos: VideoFile[]) => {
    const totalSeconds = videos.reduce((sum, video) => sum + (video.meta.duration || 0), 0)
    if (totalSeconds < 60) {
      return `${totalSeconds}秒`
    }
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (minutes < 60) {
      return `${minutes}分${seconds > 0 ? `${seconds}秒` : ''}`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}小时${remainingMinutes > 0 ? `${remainingMinutes}分` : ''}`
  }

  // 格式化时长辅助函数
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}秒`
    }
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (minutes < 60) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const sortBar = (
    <div className="mb-2 flex items-center gap-3 flex-wrap">
      <span className="text-xs text-muted-foreground shrink-0">
        {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-1">
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSortChange(opt.value)}
            className={`flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] transition-smooth ${
              sortField === opt.value
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
            }`}
          >
            {opt.label}
            {sortField === opt.value && opt.value !== 'default' && (
              sortDirection === 'desc'
                ? <ArrowDown className="h-3 w-3" />
                : <ArrowUp className="h-3 w-3" />
            )}
          </button>
        ))}
      </div>
    </div>
  )

  if (viewMode === 'list') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 视频列表区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {sortBar}
          <div className="space-y-1.5">
            {filteredVideos.map(video => (
              <VideoListItem 
                key={video.id} 
                video={video} 
                onAddToPlaylist={addToPlaylist}
              />
            ))}
          </div>
        </div>
        
        {/* 自选播放列表区 */}
        <div className={cn(
          "border-t border-border/50 bg-surface transition-all duration-300 flex flex-col",
          isPlaylistExpanded ? "max-h-56" : "h-10",
          isDraggingOver && "bg-primary/5 border-primary/30"
        )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 播放列表标题栏 */}
          <div className="h-10 flex items-center justify-between px-3 border-b border-border/30 bg-surface/90 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListVideo className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground">自选播放列表</span>
              <span className="text-[10px] text-muted-foreground">
                {playlist.length} 个视频{playlist.length > 0 ? ` · ${calculateTotalDuration(playlist)}` : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {playlist.length > 0 && (
                <>
                  <button
                    onClick={playEntirePlaylist}
                    className="h-6 px-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-medium flex items-center gap-1 transition-colors shadow-sm"
                    title="播放整个播放列表"
                  >
                    <Play className="h-2.5 w-2.5" />
                    播放列表
                  </button>
                  <button
                    onClick={clearPlaylist}
                    className="h-6 px-2 rounded-md bg-surface hover:bg-surface-hover text-muted-foreground text-[10px] font-medium flex items-center gap-1 transition-colors"
                    title="清空播放列表"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    清空
                  </button>
                </>
              )}
              <button
                onClick={() => setIsPlaylistExpanded(!isPlaylistExpanded)}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-hover transition-colors"
                title={isPlaylistExpanded ? "收起播放列表" : "展开播放列表"}
              >
                {isPlaylistExpanded ? (
                  <X className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Plus className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
          
          {/* 播放列表内容 - 展开时显示 */}
          {isPlaylistExpanded && (
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {playlist.length === 0 ? (
                <div className="h-24 flex flex-col items-center justify-center p-4 text-center">
                  <ListVideo className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <div className="text-xs text-muted-foreground/70">
                    将视频拖放到此区域，或点击视频的"添加到播放列表"按钮
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 flex flex-wrap gap-1.5">
                  {playlist.map((video, index) => (
                    <div
                      key={video.id}
                      className="group flex items-center gap-1.5 rounded-md hover:bg-surface-hover px-2 py-1 transition-colors"
                      style={{ width: 'calc(20% - 5px)' }}
                      title={video.name}
                    >
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">{index + 1}.</span>
                      <span className="text-xs text-foreground truncate min-w-0">{video.name}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto">
                        <button
                          onClick={() => playPlaylistVideo(video)}
                          className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-hover transition-colors"
                          title="播放此视频"
                        >
                          <Play className="h-3 w-3 text-foreground" />
                        </button>
                        <button
                          onClick={() => removeFromPlaylist(video.id)}
                          className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-hover transition-colors"
                          title="从播放列表移除"
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 按年月分组视频
  const groupVideosByMonth = (videos: VideoFile[]) => {
    const groups: Record<string, VideoFile[]> = {}
    
    videos.forEach(video => {
      const date = new Date(video.lastModified)
      const key = `${date.getFullYear()}年${date.getMonth() + 1}月`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(video)
    })
    
    // 按时间倒序排序
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[1][0].lastModified)
      const dateB = new Date(b[1][0].lastModified)
      return dateB.getTime() - dateA.getTime()
    })
  }

  const groupedVideos = groupVideosByMonth(filteredVideos)
  
  // 切换月份展开/收起
  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey)
      } else {
        newSet.add(monthKey)
      }
      return newSet
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 视频列表区域 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {sortBar}
        <div className="space-y-4">
          {groupedVideos.map(([monthKey, videos]) => {
            const isCollapsed = collapsedMonths.has(monthKey)
            return (
              <div key={monthKey}>
                {/* 年月分割线 - 可点击 */}
                <div 
                  className="flex items-center gap-3 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="h-px flex-1 bg-border/50" />
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2 py-1 rounded-full bg-surface border border-border/50 hover:bg-surface-hover transition-colors">
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    <span>{monthKey}</span>
                    {isCollapsed && (
                      <span className="text-primary">({videos.length})</span>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                {/* 该月的视频网格 */}
                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                    {videos.map(video => (
                      <VideoCard 
                        key={video.id} 
                        video={video} 
                        onAddToPlaylist={addToPlaylist}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* 自选播放列表区 */}
      <div className={cn(
        "border-t border-border/50 bg-surface transition-all duration-300 flex flex-col",
        isPlaylistExpanded ? "max-h-56" : "h-10",
        isDraggingOver && "bg-primary/5 border-primary/30"
      )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 播放列表标题栏 */}
        <div className="h-10 flex items-center justify-between px-3 border-b border-border/30 bg-surface/90 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ListVideo className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">自选播放列表</span>
            <span className="text-[10px] text-muted-foreground">
              {playlist.length} 个视频{playlist.length > 0 ? ` · ${calculateTotalDuration(playlist)}` : ''}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {playlist.length > 0 && (
              <>
                <button
                  onClick={playEntirePlaylist}
                  className="h-6 px-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-medium flex items-center gap-1 transition-colors shadow-sm"
                  title="播放整个播放列表"
                >
                    <Play className="h-2.5 w-2.5" />
                  播放列表
                </button>
                <button
                  onClick={clearPlaylist}
                  className="h-6 px-2 rounded-md bg-surface hover:bg-surface-hover text-muted-foreground text-[10px] font-medium flex items-center gap-1 transition-colors"
                  title="清空播放列表"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  清空
                </button>
              </>
            )}
            <button
              onClick={() => setIsPlaylistExpanded(!isPlaylistExpanded)}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-surface-hover transition-colors"
              title={isPlaylistExpanded ? "收起播放列表" : "展开播放列表"}
            >
              {isPlaylistExpanded ? (
                <X className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Plus className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
        
        {/* 播放列表内容 - 展开时显示 */}
        {isPlaylistExpanded && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {playlist.length === 0 ? (
              <div className="h-24 flex flex-col items-center justify-center p-4 text-center">
                <ListVideo className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <div className="text-xs text-muted-foreground/70">
                  将视频拖放到此区域，或点击视频的"添加到播放列表"按钮
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 flex flex-wrap gap-1.5">
                {playlist.map((video, index) => (
                  <div
                    key={video.id}
                    className="group flex items-center gap-1.5 rounded-md hover:bg-surface-hover px-2 py-1 transition-colors"
                    style={{ width: 'calc(20% - 5px)' }}
                    title={video.name}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0">{index + 1}.</span>
                    <span className="text-xs text-foreground truncate min-w-0">{video.name}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto">
                      <button
                        onClick={() => playPlaylistVideo(video)}
                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-hover transition-colors"
                        title="播放此视频"
                      >
                        <Play className="h-3 w-3 text-foreground" />
                      </button>
                      <button
                        onClick={() => removeFromPlaylist(video.id)}
                        className="h-5 w-5 rounded flex items-center justify-center hover:bg-surface-hover transition-colors"
                        title="从播放列表移除"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}