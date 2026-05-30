# 纯前端浏览器模式 - 实现指南

## 🎯 目标

将 VideoVault 改造为纯前端应用，用户通过浏览器选择文件夹后，直接在浏览器中预览和播放本地视频文件，无需后端服务器。

## 📐 新架构

### 核心组件

1. **BrowserModeProvider** (`src/lib/browser-mode.tsx`)
   - 管理用户选择的文件夹
   - 存储 File 对象
   - 生成 VideoFile 列表

2. **Browser Video Utils** (`src/lib/browser-video.ts`)
   - 注册/注销 File 对象
   - 创建 Object URL（用于视频播放）
   - 提取视频元数据

3. **Modified Video Player**
   - 支持从 Object URL 播放视频
   - 自动清理资源

## 🔧 实现步骤

### 步骤 1: 集成 BrowserModeProvider

在 `App.tsx` 中添加 Provider：

```tsx
import { BrowserModeProvider } from '@/lib/browser-mode'

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <BrowserModeProvider>
          <Routes>
            {/* ... */}
          </Routes>
        </BrowserModeProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
```

### 步骤 2: 修改设置界面

在 `settings-modal.tsx` 中，当用户选择文件夹时：

```tsx
import { useBrowserMode } from '@/lib/browser-mode'
import { registerFiles } from '@/lib/browser-video'

const { setFolder, getVideoFiles } = useBrowserMode()

const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files
  if (!files) return
  
  // 1. 保存文件夹到 BrowserMode
  setFolder(files)
  
  // 2. 获取生成的 VideoFile 列表
  const videoFiles = getVideoFiles()
  
  // 3. 注册 File 对象（用于后续播放）
  const fileArray = Array.from(files).filter(file => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '')
  })
  
  const videoIds = videoFiles.map(v => v.id)
  registerFiles(fileArray, videoIds)
  
  // 4. 更新全局状态（需要修改 store）
  // TODO: 将 videoFiles 添加到 store
  
  toast(`Loaded ${videoFiles.length} videos`, 'success')
}
```

### 步骤 3: 修改视频流处理

在视频播放器中，使用 Object URL 而不是后端 API：

```tsx
import { getVideoUrl } from '@/lib/browser-video'
import { useBrowserMode } from '@/lib/browser-mode'

function VideoPlayer({ videoId }: { videoId: string }) {
  const { isBrowserMode } = useBrowserMode()
  
  // 根据模式选择视频源
  const videoSrc = isBrowserMode 
    ? getVideoUrl(videoId)  // 浏览器模式：使用 Object URL
    : `/video-stream/${videoId}`  // 服务器模式：使用后端 API
  
  return (
    <video src={videoSrc} controls />
  )
}
```

### 步骤 4: 修改缩略图生成

浏览器模式下，需要从 File 对象生成缩略图：

```tsx
import { extractVideoMetadata } from '@/lib/browser-video'

async function generateThumbnail(file: File) {
  const metadata = await extractVideoMetadata(file)
  // 使用 canvas 截取第一帧
  // ...
}
```

## ⚠️ 限制和注意事项

### 1. 持久化问题

**问题**: 页面刷新后，File 对象会丢失

**解决方案**:
- 提示用户重新选择文件夹
- 或使用 IndexedDB 存储（复杂，有大小限制）
- 或使用 File System Access API（仅 Chrome/Edge）

### 2. 性能考虑

**大文件处理**:
- Object URL 不会立即加载整个文件
- 视频播放是流式的，内存占用可控
- 但大量视频可能导致内存压力

**建议**:
- 限制同时显示的视频数量（虚拟滚动）
- 及时清理不用的 Object URL
- 懒加载视频元数据

### 3. 功能限制

**无法实现的功能**:
- ❌ 服务器端视频处理（FFmpeg）
- ❌ 自动生成缩略图（需要额外实现）
- ❌ 视频转码
- ❌ 持久化标签和元数据（需用 localStorage/IndexedDB）

**可以替代实现**:
- ✅ 前端提取视频元数据（时长、分辨率）
- ✅ Canvas 生成缩略图
- ✅ localStorage 保存标签
- ✅ 前端搜索和过滤

## 🚀 快速原型实现

为了快速验证概念，可以先实现最小可行版本：

1. ✅ 文件夹选择
2. ✅ 视频列表显示
3. ✅ 基本播放功能
4. ⏸️ 缩略图（先用图标代替）
5. ⏸️ 元数据提取（后续添加）
6. ⏸️ 标签系统（后续添加）

## 📝 代码示例

完整的文件夹选择和处理流程：

```tsx
// 在组件中
const inputRef = useRef<HTMLInputElement>(null)
const { setFolder, getVideoFiles, currentFolder } = useBrowserMode()

const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files
  if (!files?.length) return
  
  // 1. 保存文件夹
  setFolder(files)
  
  // 2. 获取视频列表
  const videos = getVideoFiles()
  
  // 3. 注册文件用于播放
  const videoFiles = Array.from(files).filter(f => 
    f.name.match(/\.(mp4|mkv|avi|mov|wmv|webm)$/i)
  )
  registerFiles(videoFiles, videos.map(v => v.id))
  
  // 4. 异步提取元数据
  for (const [index, file] of videoFiles.entries()) {
    const metadata = await extractVideoMetadata(file)
    // 更新视频的元数据
    updateVideoMeta(videos[index].id, metadata)
  }
  
  toast(`Loaded ${videos.length} videos`, 'success')
}

return (
  <>
    <input
      ref={inputRef}
      type="file"
      webkitdirectory=""
      directory=""
      multiple
      onChange={handleSelect}
      className="hidden"
      accept="video/*"
    />
    <button onClick={() => inputRef.current?.click()}>
      Select Folder
    </button>
    
    {currentFolder && (
      <div>
        <h3>{currentFolder.name}</h3>
        <p>{currentFolder.videoFiles.length} videos</p>
      </div>
    )}
  </>
)
```

## 🔄 迁移策略

### 方案 A: 双模式并存（推荐）

保留原有的服务器模式，新增浏览器模式：

```tsx
const { isBrowserMode } = useBrowserMode()

if (isBrowserMode) {
  // 使用浏览器模式的数据源
  const videos = getVideoFiles()
} else {
  // 使用服务器模式的数据源
  const videos = useApp().videos
}
```

**优点**:
- 用户可以自由选择
- 平滑过渡
- 保留完整功能

**缺点**:
- 代码复杂度增加
- 需要维护两套逻辑

### 方案 B: 完全切换到浏览器模式

移除所有后端依赖，纯前端实现。

**优点**:
- 简化部署（只需静态文件）
- 更好的隐私保护
- 无服务器成本

**缺点**:
- 功能受限
- 无法处理大库
- 每次需重新选择文件夹

## 💡 最佳实践

1. **资源管理**
   ```tsx
   useEffect(() => {
     return () => {
       // 组件卸载时清理
       cleanupAllUrls()
     }
   }, [])
   ```

2. **错误处理**
   ```tsx
   try {
     const url = getVideoUrl(videoId)
     if (!url) throw new Error('Video not available')
   } catch (err) {
     console.error('Failed to load video:', err)
   }
   ```

3. **用户体验**
   - 显示加载状态
   - 提供清晰的提示
   - 允许取消操作

## 📚 相关 API

- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- [URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

---

**下一步**: 根据这个指南逐步实现纯前端模式，或告诉我您想先实现哪个部分。
