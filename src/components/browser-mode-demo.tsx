import { useState, useRef } from 'react'
import { Upload, Video, X, Play } from 'lucide-react'
import { registerFiles, getVideoUrl, cleanupAllUrls } from '@/lib/browser-video'

interface LocalVideo {
  id: string
  file: File
  name: string
  size: number
  url: string | null
}

export function BrowserModeDemo() {
  const [videos, setVideos] = useState<LocalVideo[]>([])
  const [selectedVideo, setSelectedVideo] = useState<LocalVideo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 过滤视频文件
    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts']
    const videoFiles: File[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext && videoExtensions.includes(ext)) {
        videoFiles.push(file)
      }
    }

    if (videoFiles.length === 0) {
      alert('No video files found in selected folder')
      return
    }

    // 创建视频列表
    const newVideos: LocalVideo[] = videoFiles.map((file, index) => ({
      id: `local-${file.name}-${file.size}-${index}`,
      file,
      name: file.name,
      size: file.size,
      url: null,
    }))

    // 注册文件
    const fileArray = newVideos.map(v => v.file)
    const videoIds = newVideos.map(v => v.id)
    registerFiles(fileArray, videoIds)

    setVideos(newVideos)
    console.log(`Loaded ${newVideos.length} videos`)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const playVideo = (video: LocalVideo) => {
    const url = getVideoUrl(video.id)
    if (url) {
      setSelectedVideo({ ...video, url })
    }
  }

  const closePlayer = () => {
    setSelectedVideo(null)
  }

  const clearAll = () => {
    setVideos([])
    setSelectedVideo(null)
    cleanupAllUrls()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pure Frontend Video Browser
          </h1>
          <p className="text-muted-foreground">
            Select a folder to browse and play videos locally in your browser. No server required.
          </p>
        </div>

        {/* Folder Selector */}
        <div className="mb-8">
          <input
            ref={fileInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderSelect}
            className="hidden"
            accept="video/*"
          />
          
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Select Folder
            </button>
            
            {videos.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                <X className="w-5 h-5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {videos.length > 0 && (
          <div className="mb-6 p-4 bg-surface rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <span className="font-medium">{videos.length} videos found</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Total size: {formatFileSize(videos.reduce((sum, v) => sum + v.size, 0))}
              </span>
            </div>
          </div>
        )}

        {/* Video Grid */}
        {videos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group relative bg-card rounded-lg border border-border overflow-hidden hover:border-primary transition-colors cursor-pointer"
                onClick={() => playVideo(video)}
              >
                {/* Thumbnail placeholder */}
                <div className="aspect-video bg-surface flex items-center justify-center">
                  <Play className="w-12 h-12 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground truncate mb-1" title={video.name}>
                    {video.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(video.size)}
                  </p>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-16 h-16 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {videos.length === 0 && (
          <div className="text-center py-20">
            <Video className="w-24 h-24 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No videos loaded
            </h3>
            <p className="text-muted-foreground">
              Click "Select Folder" to browse videos from your local folder
            </p>
          </div>
        )}

        {/* Video Player Modal */}
        {selectedVideo && selectedVideo.url && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-6xl">
              {/* Close button */}
              <button
                onClick={closePlayer}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>

              {/* Video player */}
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                className="w-full rounded-lg"
                onEnded={closePlayer}
              >
                Your browser does not support the video tag.
              </video>

              {/* Video info */}
              <div className="mt-4 text-white">
                <h3 className="text-lg font-medium">{selectedVideo.name}</h3>
                <p className="text-sm text-gray-400">
                  {formatFileSize(selectedVideo.size)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
