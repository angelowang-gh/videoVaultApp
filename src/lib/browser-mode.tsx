import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { VideoFile } from './types'

interface BrowserFolder {
  id: string
  name: string
  files: File[]
  videoFiles: File[]
  selectedAt: Date
}

interface BrowserModeContextType {
  // 当前选中的文件夹
  currentFolder: BrowserFolder | null
  // 设置文件夹
  setFolder: (files: FileList | null) => void
  // 清除文件夹
  clearFolder: () => void
  // 从 File 对象生成 VideoFile 列表
  getVideoFiles: () => VideoFile[]
  // 是否处于浏览器模式
  isBrowserMode: boolean
}

const BrowserModeContext = createContext<BrowserModeContextType | null>(null)

export function BrowserModeProvider({ children }: { children: React.ReactNode }) {
  const [currentFolder, setCurrentFolder] = useState<BrowserFolder | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 从 File 对象创建 VideoFile
  const createVideoFileFromFile = useCallback((file: File, index: number): VideoFile => {
    // 生成唯一ID
    const id = `browser-${file.name}-${file.size}-${index}`
    
    // 获取文件扩展名
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    
    return {
      id,
      name: file.name,
      path: file.webkitRelativePath || file.name, // 使用相对路径
      size: file.size,
      extension,
      lastModified: file.lastModified,
      tagIds: [],
      meta: {
        rating: 0,
        country: '',
        scene: '',
        person: '',
        // 注意：浏览器模式下无法获取以下信息，需要后续通过视频元素读取
        width: undefined,
        height: undefined,
        resolution: undefined,
        orientation: undefined,
        duration: undefined,
        durationCategory: undefined,
      },
    }
  }, [])

  // 处理文件夹选择
  const setFolder = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) {
      clearFolder()
      return
    }

    // 提取文件夹名称
    let folderName = 'Selected Folder'
    const firstFile = files[0]
    if (firstFile.webkitRelativePath) {
      const parts = firstFile.webkitRelativePath.split('/')
      folderName = parts[0] || 'Selected Folder'
    }

    // 过滤视频文件
    const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts']
    const allFiles: File[] = Array.from(files)
    const videoFiles = allFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      return videoExtensions.includes(ext)
    })

    if (videoFiles.length === 0) {
      alert('No video files found in selected folder')
      return
    }

    // 创建文件夹对象
    const folder: BrowserFolder = {
      id: `folder-${Date.now()}`,
      name: folderName,
      files: allFiles,
      videoFiles,
      selectedAt: new Date(),
    }

    setCurrentFolder(folder)
    console.log(`Loaded ${videoFiles.length} videos from "${folderName}"`)
  }, [])

  // 清除文件夹
  const clearFolder = useCallback(() => {
    setCurrentFolder(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // 获取 VideoFile 列表
  const getVideoFiles = useCallback((): VideoFile[] => {
    if (!currentFolder) return []
    
    return currentFolder.videoFiles.map((file, index) => 
      createVideoFileFromFile(file, index)
    )
  }, [currentFolder, createVideoFileFromFile])

  const value: BrowserModeContextType = {
    currentFolder,
    setFolder,
    clearFolder,
    getVideoFiles,
    isBrowserMode: currentFolder !== null,
  }

  return (
    <BrowserModeContext.Provider value={value}>
      {children}
    </BrowserModeContext.Provider>
  )
}

export function useBrowserMode() {
  const context = useContext(BrowserModeContext)
  if (!context) {
    throw new Error('useBrowserMode must be used within BrowserModeProvider')
  }
  return context
}
