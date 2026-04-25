import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from './api'
import type { VideoFile, Tag, VideoMeta, Resolution, Orientation, Rating, DurationCategory, SortField, SortDirection } from './types'

export interface Filters {
  searchQuery: string
  selectedTagIds: string[]
  selectedPath: string | null
  resolution: Resolution | null
  orientation: Orientation | null
  rating: Rating | null
  duration: DurationCategory | null
  country: string | null
  scene: string | null
  person: string | null
}

interface AppState {
  videos: VideoFile[]
  tags: Tag[]
  scanPaths: string[]
  countries: string[]
  scenes: string[]
  persons: string[]
  loading: boolean
  filters: Filters
  sortField: SortField
  sortDirection: SortDirection
  viewMode: 'grid' | 'list'
  showSettings: boolean
}

interface AppContextType extends AppState {
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  clearFilters: () => void
  setViewMode: (mode: 'grid' | 'list') => void
  setSortField: (field: SortField) => void
  setSortDirection: (dir: SortDirection) => void
  setShowSettings: (show: boolean) => void
  refreshVideos: () => Promise<void>
  refreshTags: () => Promise<void>
  addTag: (name: string, color: string) => Promise<void>
  updateTag: (id: string, name: string, color: string) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  updateVideoTags: (videoId: string, tagIds: string[]) => Promise<void>
  updateVideoMeta: (videoId: string, meta: Partial<VideoMeta>) => Promise<void>
  batchUpdateMeta: (updates: Record<string, Partial<VideoMeta>>) => Promise<void>
  extractVideoDurations: (videoIds?: string[]) => Promise<{ extracted: number; failed: number }>
  addScanPath: (path: string) => Promise<void>
  removeScanPath: (path: string) => Promise<void>
  updateCountries: (list: string[]) => Promise<void>
  updateScenes: (list: string[]) => Promise<void>
  updatePersons: (list: string[]) => Promise<void>
  filteredVideos: VideoFile[]
  resolutionCounts: Record<string, number>
  orientationCounts: Record<string, number>
  ratingCounts: Record<number, number>
  durationCounts: Record<string, number>
  countryCounts: Record<string, number>
  sceneCounts: Record<string, number>
  personCounts: Record<string, number>
  pathCounts: Record<string, number>
}

const defaultFilters: Filters = {
  searchQuery: '',
  selectedTagIds: [],
  selectedPath: null,
  resolution: null,
  orientation: null,
  rating: null,
  duration: null,
  country: null,
  scene: null,
  person: null,
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    videos: [],
    tags: [],
    scanPaths: [],
    countries: [],
    scenes: [],
    persons: [],
    loading: true,
    filters: { ...defaultFilters },
    sortField: 'default' as SortField,
    sortDirection: 'desc' as SortDirection,
    viewMode: 'grid',
    showSettings: false,
  })

  const refreshVideos = useCallback(async () => {
    try {
      const result = await api.getVideos()
      setState(s => ({ ...s, videos: result.videos }))
    } catch (err) { console.error('Failed to load videos:', err) }
  }, [])

  const refreshTags = useCallback(async () => {
    try {
      const tags = await api.getTags()
      setState(s => ({ ...s, tags }))
    } catch (err) { console.error('Failed to load tags:', err) }
  }, [])

  const refreshScanPaths = useCallback(async () => {
    try {
      const paths = await api.getScanPaths()
      setState(s => ({ ...s, scanPaths: paths }))
    } catch (err) { console.error('Failed to load scan paths:', err) }
  }, [])

  const refreshCountries = useCallback(async () => {
    try { const c = await api.getCountries(); setState(s => ({ ...s, countries: c })) }
    catch (err) { console.error('Failed to load countries:', err) }
  }, [])

  const refreshScenes = useCallback(async () => {
    try { const sc = await api.getScenes(); setState(s => ({ ...s, scenes: sc })) }
    catch (err) { console.error('Failed to load scenes:', err) }
  }, [])

  const refreshPersons = useCallback(async () => {
    try { const p = await api.getPersons(); setState(s => ({ ...s, persons: p })) }
    catch (err) { console.error('Failed to load persons:', err) }
  }, [])

  useEffect(() => {
    async function init() {
      setState(s => ({ ...s, loading: true }))
      await Promise.all([refreshVideos(), refreshTags(), refreshScanPaths(), refreshCountries(), refreshScenes(), refreshPersons()])
      setState(s => ({ ...s, loading: false }))
    }
    init()
  }, [refreshVideos, refreshTags, refreshScanPaths, refreshCountries, refreshScenes, refreshPersons])

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setState(s => ({ ...s, filters: { ...s.filters, [key]: value } }))
  }, [])

  const clearFilters = useCallback(() => {
    setState(s => ({ ...s, filters: { ...defaultFilters } }))
  }, [])

  const setViewMode = useCallback((mode: 'grid' | 'list') => { setState(s => ({ ...s, viewMode: mode })) }, [])
  const setSortField = useCallback((field: SortField) => { setState(s => ({ ...s, sortField: field })) }, [])
  const setSortDirection = useCallback((dir: SortDirection) => { setState(s => ({ ...s, sortDirection: dir })) }, [])
  const setShowSettings = useCallback((show: boolean) => { setState(s => ({ ...s, showSettings: show })) }, [])

  const addTag = useCallback(async (name: string, color: string) => { await api.createTag(name, color); await refreshTags() }, [refreshTags])
  const updateTag = useCallback(async (id: string, name: string, color: string) => { await api.updateTag(id, name, color); await refreshTags() }, [refreshTags])
  const deleteTag = useCallback(async (id: string) => { await api.deleteTag(id); await refreshTags(); await refreshVideos() }, [refreshTags, refreshVideos])

  const updateVideoTags = useCallback(async (videoId: string, tagIds: string[]) => {
    await api.updateVideoTags(videoId, tagIds)
    setState(s => ({ ...s, videos: s.videos.map(v => v.id === videoId ? { ...v, tagIds } : v) }))
  }, [])

  const updateVideoMeta = useCallback(async (videoId: string, meta: Partial<VideoMeta>) => {
    const updated = await api.updateVideoMeta(videoId, meta)
    setState(s => ({ ...s, videos: s.videos.map(v => v.id === videoId ? { ...v, meta: updated } : v) }))
  }, [])

  const batchUpdateMeta = useCallback(async (updates: Record<string, Partial<VideoMeta>>) => {
    await api.batchUpdateMeta(updates)
    setState(s => ({
      ...s,
      videos: s.videos.map(v => { const u = updates[v.id]; return u ? { ...v, meta: { ...v.meta, ...u } } : v }),
    }))
  }, [])

  const extractVideoDurations = useCallback(async (videoIds?: string[]): Promise<{ extracted: number; failed: number }> => {
    // 导入函数以避免循环依赖
    const { extractVideoDuration } = await import('./thumbnail')
    const { classifyDuration } = await import('./types')
    
    const targetVideoIds = videoIds || state.videos.map(v => v.id)
    const updates: Record<string, Partial<VideoMeta>> = {}
    let extracted = 0
    let failed = 0
    
    // 批量处理，避免同时加载太多视频
    for (let i = 0; i < targetVideoIds.length; i += 5) {
      const batch = targetVideoIds.slice(i, i + 5)
      const promises = batch.map(async (videoId) => {
        try {
          const duration = await extractVideoDuration(videoId)
          if (duration && duration > 0) {
            updates[videoId] = {
              duration,
              durationCategory: classifyDuration(duration)
            }
            return { success: true }
          } else {
            return { success: false }
          }
        } catch {
          return { success: false }
        }
      })
      
      const results = await Promise.all(promises)
      results.forEach(result => {
        if (result.success) extracted++
        else failed++
      })
      
      // 每批完成后更新一次
      if (Object.keys(updates).length > 0) {
        await batchUpdateMeta(updates)
        // 清空updates继续下一批
        Object.keys(updates).forEach(key => delete updates[key])
      }
      
      // 短暂延迟避免浏览器阻塞
      if (i + 5 < targetVideoIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return { extracted, failed }
  }, [state.videos, batchUpdateMeta])

  const addScanPath = useCallback(async (p: string) => { await api.addScanPath(p); await refreshScanPaths(); await refreshVideos() }, [refreshScanPaths, refreshVideos])
  const removeScanPath = useCallback(async (p: string) => { await api.removeScanPath(p); await refreshScanPaths(); await refreshVideos() }, [refreshScanPaths, refreshVideos])
  const updateCountries = useCallback(async (list: string[]) => { await api.updateCountries(list); setState(s => ({ ...s, countries: list })) }, [])
  const updateScenes = useCallback(async (list: string[]) => { await api.updateScenes(list); setState(s => ({ ...s, scenes: list })) }, [])
  const updatePersons = useCallback(async (list: string[]) => { await api.updatePersons(list); setState(s => ({ ...s, persons: list })) }, [])

  const { filters } = state
  const filtered = state.videos.filter(v => {
    if (filters.searchQuery && !v.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false
    if (filters.selectedTagIds.length > 0 && !filters.selectedTagIds.some(tid => v.tagIds.includes(tid))) return false
    if (filters.selectedPath && !v.path.startsWith(filters.selectedPath)) return false
    if (filters.resolution && v.meta.resolution !== filters.resolution) return false
    if (filters.orientation && v.meta.orientation !== filters.orientation) return false
    if (filters.rating !== null && v.meta.rating !== filters.rating) return false
    if (filters.duration && v.meta.durationCategory !== filters.duration) return false
    if (filters.country && v.meta.country !== filters.country) return false
    if (filters.scene && v.meta.scene !== filters.scene) return false
    if (filters.person && v.meta.person !== filters.person) return false
    return true
  })

  const { sortField, sortDirection } = state
  const filteredVideos = sortField === 'default' ? filtered : [...filtered].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'duration': cmp = (a.meta.duration || 0) - (b.meta.duration || 0); break
      case 'size': cmp = a.size - b.size; break
      case 'date': cmp = a.lastModified - b.lastModified; break
      case 'rating': cmp = a.meta.rating - b.meta.rating; break
    }
    return sortDirection === 'asc' ? cmp : -cmp
  })

  const resolutionCounts: Record<string, number> = {}
  const orientationCounts: Record<string, number> = {}
  const ratingCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const durationCounts: Record<string, number> = {}
  const countryCounts: Record<string, number> = {}
  const sceneCounts: Record<string, number> = {}
  const personCounts: Record<string, number> = {}
  const pathCounts: Record<string, number> = {}

  for (const v of state.videos) {
    if (v.meta.resolution) resolutionCounts[v.meta.resolution] = (resolutionCounts[v.meta.resolution] || 0) + 1
    if (v.meta.orientation) orientationCounts[v.meta.orientation] = (orientationCounts[v.meta.orientation] || 0) + 1
    ratingCounts[v.meta.rating] = (ratingCounts[v.meta.rating] || 0) + 1
    if (v.meta.durationCategory) durationCounts[v.meta.durationCategory] = (durationCounts[v.meta.durationCategory] || 0) + 1
    if (v.meta.country) countryCounts[v.meta.country] = (countryCounts[v.meta.country] || 0) + 1
    if (v.meta.scene) sceneCounts[v.meta.scene] = (sceneCounts[v.meta.scene] || 0) + 1
    if (v.meta.person) personCounts[v.meta.person] = (personCounts[v.meta.person] || 0) + 1
    for (const sp of state.scanPaths) {
      if (v.path.startsWith(sp)) { pathCounts[sp] = (pathCounts[sp] || 0) + 1; break }
    }
  }

  return (
    <AppContext.Provider value={{
      ...state, setFilter, clearFilters, setViewMode, setSortField, setSortDirection, setShowSettings,
      refreshVideos, refreshTags, addTag, updateTag, deleteTag,
      updateVideoTags, updateVideoMeta, batchUpdateMeta, extractVideoDurations,
      addScanPath, removeScanPath, updateCountries, updateScenes, updatePersons,
      filteredVideos, resolutionCounts, orientationCounts, ratingCounts,
      durationCounts, countryCounts, sceneCounts, personCounts, pathCounts,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
