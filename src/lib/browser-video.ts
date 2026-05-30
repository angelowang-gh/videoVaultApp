/**
 * 浏览器模式下的视频处理工具
 */

// 存储 File 对象的 Map，用于通过 videoId 获取文件
const fileMap = new Map<string, File>()
// 存储 Object URL 的 Map，用于清理
const urlMap = new Map<string, string>()

/**
 * 注册 File 对象
 */
export function registerFile(videoId: string, file: File) {
  fileMap.set(videoId, file)
}

/**
 * 注销 File 对象并清理 URL
 */
export function unregisterFile(videoId: string) {
  const url = urlMap.get(videoId)
  if (url) {
    URL.revokeObjectURL(url)
    urlMap.delete(videoId)
  }
  fileMap.delete(videoId)
}

/**
 * 获取视频的 Object URL
 */
export function getVideoUrl(videoId: string): string | null {
  // 如果已经有缓存的 URL，直接返回
  if (urlMap.has(videoId)) {
    return urlMap.get(videoId)!
  }

  const file = fileMap.get(videoId)
  if (!file) {
    console.warn(`File not found for videoId: ${videoId}`)
    return null
  }

  // 创建 Object URL
  const url = URL.createObjectURL(file)
  urlMap.set(videoId, url)
  return url
}

/**
 * 批量注册文件
 */
export function registerFiles(files: File[], videoIds: string[]) {
  files.forEach((file, index) => {
    if (videoIds[index]) {
      registerFile(videoIds[index], file)
    }
  })
}

/**
 * 清理所有 URL
 */
export function cleanupAllUrls() {
  urlMap.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  urlMap.clear()
  fileMap.clear()
}

/**
 * 从 File 对象提取视频元数据（时长、分辨率等）
 */
export async function extractVideoMetadata(file: File): Promise<{
  duration?: number
  width?: number
  height?: number
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    const url = URL.createObjectURL(file)
    
    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      }
      URL.revokeObjectURL(url)
      resolve(metadata)
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({})
    }
    
    video.src = url
  })
}
