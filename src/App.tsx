import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/lib/store'
import { Sidebar, TopBar } from '@/components/layout'
import { VideoGrid } from '@/components/video-grid'
import { VideoPlayerPage } from '@/components/video-player'
import { PlaylistPlayerPage } from '@/components/playlist-player'
import { SettingsModal } from '@/components/settings-modal'
import { ToastContainer } from '@/components/ui/toast'
import { useApp } from '@/lib/store'
import { setDimensionFlushCallback, invalidateThumbnailCache } from '@/lib/thumbnail'

function MainPage() {
  const { showSettings, batchUpdateMeta, refreshVideos } = useApp()

  // Set up auto-flush for detected video dimensions
  useEffect(() => {
    setDimensionFlushCallback((updates) => {
      if (Object.keys(updates).length > 0) {
        batchUpdateMeta(updates).catch(() => {})
      }
    })
  }, [batchUpdateMeta])

  // 监听子窗口发来的封面更新消息
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const { type, videoId } = event.data || {}
      if (type === 'video-cover-update' && videoId) {
        // 清除该视频的客户端缓存，下次渲染时会从服务器获取新封面
        invalidateThumbnailCache(videoId)
        // 强制刷新视频列表以触发重新渲染
        refreshVideos()
      }
      if (type === 'playlist-cover-update' && videoId) {
        invalidateThumbnailCache(videoId)
        refreshVideos()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [refreshVideos])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <VideoGrid />
      </main>
      {showSettings && <SettingsModal />}
      <ToastContainer />
    </div>
  )
}

function PlayerPage() {
  return (
    <>
      <VideoPlayerPage />
      <ToastContainer />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/video/:id" element={<PlayerPage />} />
          <Route path="/playlist/:id" element={<PlaylistPlayerPage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
