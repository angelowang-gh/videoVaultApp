import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Data file path
const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'app-data.json')
const THUMB_DIR = path.join(DATA_DIR, 'thumbnails')

// Video extensions
const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.m4v', '.mpg', '.mpeg', '.3gp', '.ts', '.vob', '.rmvb', '.rm'
])

const DEFAULT_COUNTRIES = ['China', 'USA', 'Japan', 'Korea', 'UK', 'France', 'Germany', 'India', 'Thailand', 'Other']
const DEFAULT_SCENES = ['Daily', 'Travel', 'Sports', 'Music', 'Tutorial', 'Gaming', 'Food', 'Nature', 'City', 'Other']
const DEFAULT_PERSONS = ['Other']

// --- Data persistence ---

interface Tag {
  id: string
  name: string
  color: string
}

interface VideoMeta {
  width?: number
  height?: number
  resolution?: string
  orientation?: string
  duration?: number
  durationCategory?: string
  rating: number
  country: string
  scene: string
  person: string
}

interface AppData {
  tags: Tag[]
  videoTags: Record<string, string[]>
  videoMeta: Record<string, VideoMeta>
  countries: string[]
  scenes: string[]
  persons: string[]
  scanPaths: string[]
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(THUMB_DIR)) {
    fs.mkdirSync(THUMB_DIR, { recursive: true })
  }
}

function loadData(): AppData {
  ensureDataDir()
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    const data = JSON.parse(raw)
    // Migrate old data
    if (!data.videoMeta) data.videoMeta = {}
    if (!data.countries) data.countries = DEFAULT_COUNTRIES
    if (!data.scenes) data.scenes = DEFAULT_SCENES
    if (!data.persons) data.persons = DEFAULT_PERSONS
    return data
  }
  const defaultData: AppData = {
    tags: [
      { id: uuidv4(), name: 'Favorite', color: 'red' },
      { id: uuidv4(), name: 'Watch Later', color: 'blue' },
      { id: uuidv4(), name: 'Tutorial', color: 'green' },
      { id: uuidv4(), name: 'Music', color: 'purple' },
      { id: uuidv4(), name: 'Movie', color: 'orange' },
    ],
    videoTags: {},
    videoMeta: {},
    countries: DEFAULT_COUNTRIES,
    scenes: DEFAULT_SCENES,
    persons: DEFAULT_PERSONS,
    scanPaths: [],
  }
  saveData(defaultData)
  return defaultData
}

function saveData(data: AppData) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// --- Helpers ---

function generateVideoId(filePath: string): string {
  let hash = 0
  for (let i = 0; i < filePath.length; i++) {
    const char = filePath.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'v_' + Math.abs(hash).toString(36)
}

const defaultMeta: VideoMeta = { rating: 0, country: '', scene: '', person: '' }

interface VideoInfo {
  id: string
  name: string
  path: string
  size: number
  extension: string
  lastModified: number
  tagIds: string[]
  meta: VideoMeta
}

function scanDirectory(dirPath: string, videoTags: Record<string, string[]>, videoMeta: Record<string, VideoMeta>): VideoInfo[] {
  const videos: VideoInfo[] = []

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (VIDEO_EXTENSIONS.has(ext)) {
            const stat = fs.statSync(fullPath)
            const id = generateVideoId(fullPath)
            videos.push({
              id,
              name: entry.name,
              path: fullPath,
              size: stat.size,
              extension: ext.slice(1),
              lastModified: stat.mtimeMs,
              tagIds: videoTags[id] || [],
              meta: videoMeta[id] || { ...defaultMeta },
            })
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(dirPath)
  return videos
}

// --- Routes ---

// Get all scanned videos
app.get('/api/videos', (_req, res) => {
  const data = loadData()
  const allVideos: VideoInfo[] = []

  for (const scanPath of data.scanPaths) {
    if (fs.existsSync(scanPath)) {
      const videos = scanDirectory(scanPath, data.videoTags, data.videoMeta)
      allVideos.push(...videos)
    }
  }

  const seen = new Set<string>()
  const unique = allVideos.filter(v => {
    if (seen.has(v.id)) return false
    seen.add(v.id)
    return true
  })

  unique.sort((a, b) => b.lastModified - a.lastModified)
  res.json({ success: true, data: { videos: unique, total: unique.length } })
})

// --- Scan paths ---
app.get('/api/scan-paths', (_req, res) => {
  const data = loadData()
  res.json({ success: true, data: data.scanPaths })
})

app.post('/api/scan-paths', (req, res) => {
  const { path: scanPath } = req.body
  if (!scanPath || typeof scanPath !== 'string') {
    res.status(400).json({ success: false, error: 'Path is required' })
    return
  }
  const normalizedPath = path.resolve(scanPath)
  if (!fs.existsSync(normalizedPath)) {
    res.status(400).json({ success: false, error: 'Path does not exist' })
    return
  }
  const data = loadData()
  if (!data.scanPaths.includes(normalizedPath)) {
    data.scanPaths.push(normalizedPath)
    saveData(data)
  }
  res.json({ success: true, data: data.scanPaths })
})

app.delete('/api/scan-paths', (req, res) => {
  const { path: scanPath } = req.body
  const data = loadData()
  data.scanPaths = data.scanPaths.filter(p => p !== scanPath)
  saveData(data)
  res.json({ success: true, data: data.scanPaths })
})

// --- Tags ---
app.get('/api/tags', (_req, res) => {
  const data = loadData()
  res.json({ success: true, data: data.tags })
})

app.post('/api/tags', (req, res) => {
  const { name, color } = req.body
  if (!name || typeof name !== 'string') {
    res.status(400).json({ success: false, error: 'Name is required' })
    return
  }
  const data = loadData()
  const tag: Tag = { id: uuidv4(), name: name.trim(), color: color || 'blue' }
  data.tags.push(tag)
  saveData(data)
  res.json({ success: true, data: tag })
})

app.put('/api/tags/:id', (req, res) => {
  const { id } = req.params
  const { name, color } = req.body
  const data = loadData()
  const tag = data.tags.find(t => t.id === id)
  if (!tag) { res.status(404).json({ success: false, error: 'Tag not found' }); return }
  if (name) tag.name = name.trim()
  if (color) tag.color = color
  saveData(data)
  res.json({ success: true, data: tag })
})

app.delete('/api/tags/:id', (req, res) => {
  const { id } = req.params
  const data = loadData()
  data.tags = data.tags.filter(t => t.id !== id)
  for (const videoId of Object.keys(data.videoTags)) {
    data.videoTags[videoId] = data.videoTags[videoId].filter(tid => tid !== id)
  }
  saveData(data)
  res.json({ success: true })
})

// --- Video tags ---
app.put('/api/videos/:id/tags', (req, res) => {
  const { id } = req.params
  const { tagIds } = req.body
  if (!Array.isArray(tagIds)) {
    res.status(400).json({ success: false, error: 'tagIds must be an array' })
    return
  }
  const data = loadData()
  data.videoTags[id] = tagIds
  saveData(data)
  res.json({ success: true, data: { id, tagIds } })
})

// --- Video meta (resolution, rating, country, scene) ---
app.put('/api/videos/:id/meta', (req, res) => {
  const { id } = req.params
  const meta = req.body
  const data = loadData()
  data.videoMeta[id] = { ...(data.videoMeta[id] || { ...defaultMeta }), ...meta }
  saveData(data)
  res.json({ success: true, data: data.videoMeta[id] })
})

// Batch update meta (for auto-detected resolution/orientation)
app.post('/api/videos/batch-meta', (req, res) => {
  const { updates } = req.body
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ success: false, error: 'updates object required' })
    return
  }
  const data = loadData()
  for (const [videoId, meta] of Object.entries(updates as Record<string, Partial<VideoMeta>>)) {
    data.videoMeta[videoId] = { ...(data.videoMeta[videoId] || { ...defaultMeta }), ...meta }
  }
  saveData(data)
  res.json({ success: true })
})

// --- Countries & Scenes lists ---
app.get('/api/countries', (_req, res) => {
  const data = loadData()
  res.json({ success: true, data: data.countries })
})

app.put('/api/countries', (req, res) => {
  const { countries } = req.body
  if (!Array.isArray(countries)) {
    res.status(400).json({ success: false, error: 'countries array required' })
    return
  }
  const data = loadData()
  data.countries = countries
  saveData(data)
  res.json({ success: true, data: data.countries })
})

app.get('/api/scenes', (_req, res) => {
  const data = loadData()
  res.json({ success: true, data: data.scenes })
})

app.put('/api/scenes', (req, res) => {
  const { scenes } = req.body
  if (!Array.isArray(scenes)) {
    res.status(400).json({ success: false, error: 'scenes array required' })
    return
  }
  const data = loadData()
  data.scenes = scenes
  saveData(data)
  res.json({ success: true, data: data.scenes })
})

app.get('/api/persons', (_req, res) => {
  const data = loadData()
  res.json({ success: true, data: data.persons })
})

app.put('/api/persons', (req, res) => {
  const { persons } = req.body
  if (!Array.isArray(persons)) {
    res.status(400).json({ success: false, error: 'persons array required' })
    return
  }
  const data = loadData()
  data.persons = persons
  saveData(data)
  res.json({ success: true, data: data.persons })
})

// --- Video streaming ---
app.get('/video-stream/:videoId', (req, res) => {
  const { videoId } = req.params
  const data = loadData()

  let targetVideo: VideoInfo | null = null
  for (const scanPath of data.scanPaths) {
    if (fs.existsSync(scanPath)) {
      const videos = scanDirectory(scanPath, data.videoTags, data.videoMeta)
      const found = videos.find(v => v.id === videoId)
      if (found) { targetVideo = found; break }
    }
  }

  if (!targetVideo || !fs.existsSync(targetVideo.path)) {
    res.status(404).json({ success: false, error: 'Video not found' })
    return
  }

  const stat = fs.statSync(targetVideo.path)
  const fileSize = stat.size
  const range = req.headers.range

  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mov: 'video/quicktime', wmv: 'video/x-ms-wmv', flv: 'video/x-flv',
    webm: 'video/webm', m4v: 'video/x-m4v', mpg: 'video/mpeg',
    mpeg: 'video/mpeg', '3gp': 'video/3gpp', ts: 'video/mp2t',
  }
  const contentType = mimeTypes[targetVideo.extension] || 'video/mp4'

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1
    const stream = fs.createReadStream(targetVideo.path, { start, end })
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    })
    stream.pipe(res)
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': contentType })
    fs.createReadStream(targetVideo.path).pipe(res)
  }
})

// --- Thumbnail cache ---
function getThumbPath(videoId: string): string {
  return path.join(THUMB_DIR, `${videoId}.jpg`)
}

app.get('/api/thumbnails/:videoId', (req, res) => {
  const { videoId } = req.params
  const thumbPath = getThumbPath(videoId)
  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    fs.createReadStream(thumbPath).pipe(res)
  } else {
    res.status(404).json({ success: false, error: 'Thumbnail not generated yet' })
  }
})

app.post('/api/thumbnails/:videoId', (req, res) => {
  const { videoId } = req.params
  const { dataUrl } = req.body
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    res.status(400).json({ success: false, error: 'Invalid image data' })
    return
  }
  ensureDataDir()
  const base64 = dataUrl.split(',')[1]
  if (!base64) { res.status(400).json({ success: false, error: 'Invalid data URL' }); return }
  const thumbPath = getThumbPath(videoId)
  fs.writeFileSync(thumbPath, Buffer.from(base64, 'base64'))
  res.json({ success: true })
})

// --- Serve frontend static files (production) ---
const DIST_DIR = path.join(process.cwd(), 'dist')
if (fs.existsSync(DIST_DIR)) {
  // Serve static assets (js, css, images, etc.)
  app.use(express.static(DIST_DIR))
}

// --- SPA fallback (must be after all API routes) ---
app.get('*', (_req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).json({ success: false, error: 'Not found' })
  }
})

app.listen(PORT, () => {
  console.log(`VideoVault server running at http://localhost:${PORT}`)
  if (fs.existsSync(DIST_DIR)) {
    console.log('  Serving frontend from dist/')
  } else {
    console.log('  No dist/ folder found, running in API-only mode')
    console.log('  Run "npm run build" first to serve the frontend')
  }
})