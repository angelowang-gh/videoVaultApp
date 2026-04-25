import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { VideoFile } from '@/lib/types'
import { Play, Pause, SkipBack, SkipForward, ListVideo, X, Clock, Monitor, Smartphone, Timer, Maximize2, Volume2, VolumeX, ChevronRight, Check, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils'
import { uploadThumbnail } from '@/lib/api'
import { invalidateThumbnailCache } from '@/lib/thumbnail'

interface PlaylistData {
  id: string
  videos: VideoFile[]
  createdAt: string
  coverDataUrl?: string
}

export function PlaylistPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(true)
  
  // 封面选取相关状态
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [coverScreenshots, setCoverScreenshots] = useState<string[]>([])
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [coverApplied, setCoverApplied] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const captureVideoRef = useRef<HTMLVideoElement | null>(null)

  // 当前视频（需要在 captureScreenshots 之前定义，避免 TDZ 错误）
  const currentVideo = playlist?.videos[currentVideoIndex]

  // 加载播放列表数据
  useEffect(() => {
    if (!id) {
      navigate('/')
      return
    }
    
    try {
      const data = sessionStorage.getItem(id)
      if (!data) {
        console.error('播放列表数据不存在:', id)
        navigate('/')
        return
      }
      
      const playlistData: PlaylistData = JSON.parse(data)
      setPlaylist(playlistData)
      
      // 可选：播放结束后清理数据
      // const cleanup = () => sessionStorage.removeItem(id)
      // window.addEventListener('beforeunload', cleanup)
      // return () => window.removeEventListener('beforeunload', cleanup)
    } catch (error) {
      console.error('加载播放列表失败:', error)
      navigate('/')
    }
  }, [id, navigate])

  // 视频事件处理
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    // 播放下一个视频
    if (playlist && currentVideoIndex < playlist.videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1)
    } else {
      // 播放列表结束
      setIsPlaying(false)
    }
  }

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleVideoClick = () => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }

  const handleSkipBack = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1)
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }

  const handleSkipForward = () => {
    if (playlist && currentVideoIndex < playlist.videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1)
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (value: number) => {
    setVolume(value)
    setIsMuted(value === 0)
    if (videoRef.current) {
      videoRef.current.volume = value
    }
  }

  const handleToggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    if (videoRef.current) {
      videoRef.current.muted = newMuted
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate)
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
    }
  }

  const handleFullscreen = () => {
    if (!playerContainerRef.current) return
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleSelectVideo = (index: number) => {
    setCurrentVideoIndex(index)
    setIsPlaying(true)
  }

  // 从当前视频中截取10张截图
  const captureScreenshots = useCallback(async () => {
    if (!videoRef.current || duration <= 0) return
    
    setIsCapturing(true)
    setCoverScreenshots([])
    setSelectedCoverIndex(null)
    setShowCoverPicker(true)
    
    const screenshots: string[] = []
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.preload = 'auto'
    video.src = `/video-stream/${currentVideo.id}`
    
    try {
      // 等待视频元数据加载
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Video load failed'))
        setTimeout(() => reject(new Error('Timeout')), 15000)
      })
      
      const videoDuration = video.duration
      if (!videoDuration || !isFinite(videoDuration)) {
        setIsCapturing(false)
        return
      }
      
      // 在视频中均匀取10个时间点
      const step = videoDuration / 11  // 避免取到首尾
      for (let i = 1; i <= 10; i++) {
        const seekTime = step * i
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Seek timeout')), 5000)
            video.onseeked = () => {
              clearTimeout(timeout)
              try {
                const canvas = document.createElement('canvas')
                const w = video.videoWidth
                const h = video.videoHeight
                // 缩放到合理尺寸
                const scale = Math.min(1, 400 / Math.max(w, h))
                canvas.width = Math.round(w * scale)
                canvas.height = Math.round(h * scale)
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                  resolve(canvas.toDataURL('image/jpeg', 0.8))
                } else {
                  reject(new Error('Canvas context failed'))
                }
              } catch (e) {
                reject(e)
              }
            }
            video.currentTime = seekTime
          })
          screenshots.push(dataUrl)
        } catch {
          // 跳过失败的截图
        }
      }
    } catch (error) {
      console.error('截取封面失败:', error)
    } finally {
      video.removeAttribute('src')
      video.load()
      setCoverScreenshots(screenshots)
      setIsCapturing(false)
    }
  }, [currentVideo, duration])

  // 确认选择封面
  const applyCover = useCallback(async () => {
    if (selectedCoverIndex === null || !coverScreenshots[selectedCoverIndex] || !playlist) return
    
    const coverDataUrl = coverScreenshots[selectedCoverIndex]
    // 更新 sessionStorage 中的播放列表数据
    const updatedPlaylist = { ...playlist, coverDataUrl }
    setPlaylist(updatedPlaylist)
    sessionStorage.setItem(playlist.id, JSON.stringify(updatedPlaylist))
    
    // 上传封面到服务器（为当前播放的视频设置封面）
    const currentVid = playlist.videos[currentVideoIndex]
    if (currentVid) {
      try {
        await uploadThumbnail(currentVid.id, coverDataUrl)
        invalidateThumbnailCache(currentVid.id)
      } catch (err) {
        console.error('上传封面失败:', err)
      }
    }
    
    setCoverApplied(true)
    setTimeout(() => setCoverApplied(false), 2000)
    
    // 通知主窗口更新封面
    if (window.opener) {
      window.opener.postMessage({
        type: 'playlist-cover-update',
        playlistId: playlist.id,
        coverDataUrl,
        videoId: currentVid?.id,
      }, '*')
    }
  }, [selectedCoverIndex, coverScreenshots, playlist, currentVideoIndex])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止在输入框中触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault()
          handleVideoClick()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5)
          }
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, duration, handleVideoClick])

  if (!playlist || !currentVideo) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载播放列表...</p>
        </div>
      </div>
    )
  }

  const totalVideos = playlist.videos.length
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  const totalDuration = playlist.videos.reduce((sum, video) => sum + (video.meta.duration || 0), 0)

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 顶部标题栏 */}
      <div className="h-12 border-b border-border/50 bg-surface/90 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="h-8 w-8 rounded flex items-center justify-center hover:bg-surface-hover transition-colors"
            title="返回主页"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
          <div>
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <ListVideo className="h-4 w-4 text-primary" />
              播放列表播放器
            </div>
            <div className="text-xs text-muted-foreground">
              共 {totalVideos} 个视频 · 总时长: {formatDuration(totalDuration)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            className="h-8 px-3 rounded-md bg-surface hover:bg-surface-hover text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ListVideo className="h-3.5 w-3.5" />
            {showPlaylist ? '隐藏列表' : '显示列表'}
          </button>
          
          <div className="text-xs text-muted-foreground">
            当前: {currentVideoIndex + 1}/{totalVideos}
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 左右布局 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧播放列表目录 */}
        {showPlaylist && (
          <div className="w-80 border-r border-border/50 bg-surface overflow-y-auto scrollbar-thin flex flex-col">
            <div className="p-4 flex-1">
              <div className="text-sm font-medium text-foreground mb-3">播放列表目录</div>
              <div className="space-y-2">
                {playlist.videos.map((video, index) => (
                  <div
                    key={video.id}
                    className={cn(
                      "group rounded-lg border p-2 cursor-pointer transition-all",
                      index === currentVideoIndex
                        ? "border-primary bg-primary/10"
                        : "border-border/50 hover:border-primary/50 hover:bg-surface-hover"
                    )}
                    onClick={() => handleSelectVideo(index)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="h-10 w-16 rounded bg-surface flex items-center justify-center overflow-hidden">
                          {video.meta.orientation === 'portrait' ? (
                            <Smartphone className="h-5 w-5 text-muted-foreground/40" />
                          ) : (
                            <Monitor className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[8px] px-1 rounded">
                          {formatDuration(video.meta.duration || 0)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {video.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>{video.meta.resolution || '未知'}</span>
                          <span>{video.extension}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* 下一个视频提示 */}
            {currentVideoIndex < totalVideos - 1 && (
              <div className="p-3 border-t border-border/30 bg-surface/80">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    下一个视频:
                  </div>
                  <button
                    onClick={handleSkipForward}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    {playlist.videos[currentVideoIndex + 1].name}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 右侧播放区域 */}
        <div ref={playerContainerRef} className="flex-1 flex flex-col overflow-hidden">
          {/* 视频播放区域 */}
          <div 
            className="flex-1 relative bg-black flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={handleVideoClick}
          >
            <video
              ref={videoRef}
              key={currentVideo.id}
              src={`/video-stream/${currentVideo.id}`}
              className="w-full h-full object-contain"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={(e) => console.error('视频加载错误:', e)}
              autoPlay
              muted={isMuted}
            />
            
            {/* 播放/暂停覆盖层 */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                  <Play className="h-8 w-8 text-primary-foreground ml-1" />
                </div>
              </div>
            )}
            
            {/* 当前视频信息 */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="text-sm font-medium truncate max-w-md">
                {currentVideo.name}
              </div>
              <div className="text-xs text-white/80 mt-1">
                {currentVideoIndex + 1}/{totalVideos} · {formatDuration(currentVideo.meta.duration || 0)}
              </div>
            </div>
          </div>

          {/* 播放控制栏 - 单行布局 */}
          <div className="bg-surface/95 backdrop-blur-sm border-t border-border/50 px-3 py-2">
            <div className="flex items-center gap-3">
              {/* 时间显示 */}
              <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{formatTime(currentTime)}/{formatTime(duration)}</span>

              {/* 进度条 */}
              <div 
                className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const percentage = clickX / rect.width
                  handleSeek(percentage * duration)
                }}
              >
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* 分隔线 */}
              <div className="h-5 w-px bg-border/50 shrink-0" />

              {/* 播放控制 */}
              <button
                onClick={handleSkipBack}
                disabled={currentVideoIndex === 0 && currentTime === 0}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  currentVideoIndex === 0 && currentTime === 0
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "hover:bg-surface-hover text-foreground"
                )}
              >
                <SkipBack className="h-4 w-4" />
              </button>
              
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center shadow-glow shrink-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                )}
              </button>
              
              <button
                onClick={handleSkipForward}
                disabled={currentVideoIndex === totalVideos - 1}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  currentVideoIndex === totalVideos - 1
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "hover:bg-surface-hover text-foreground"
                )}
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {/* 分隔线 */}
              <div className="h-5 w-px bg-border/50 shrink-0" />

              {/* 播放速率选择 */}
              <div className="relative group shrink-0">
                <button className="h-8 px-2 rounded text-xs font-medium text-muted-foreground hover:bg-surface-hover">
                  {playbackRate}x
                </button>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-popover border border-border rounded-lg shadow-lg z-10">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={cn(
                        "w-full px-3 py-2 text-xs hover:bg-surface-hover transition-colors",
                        playbackRate === rate && "bg-primary/10 text-primary"
                      )}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 音量控制 */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleToggleMute}
                  className="h-8 w-8 rounded flex items-center justify-center hover:bg-surface-hover"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-foreground" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-foreground" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-14 accent-primary"
                />
              </div>
            </div>

            {/* 封面选择面板 */}
            {showCoverPicker && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-foreground">选择一个封面</div>
                  <div className="flex items-center gap-2">
                    {coverApplied && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        已应用
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setShowCoverPicker(false)
                        setCoverScreenshots([])
                        setSelectedCoverIndex(null)
                      }}
                      className="h-6 px-2 rounded text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                </div>
                
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
        </div>
      </div>
    </div>
  )
}