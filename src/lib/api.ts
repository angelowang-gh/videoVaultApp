import type { VideoFile, Tag, ApiResponse, ScanResult, VideoMeta } from './types'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json: ApiResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export const api = {
  getVideos: () => request<ScanResult>('/videos'),

  updateVideoTags: (videoId: string, tagIds: string[]) =>
    request<{ id: string; tagIds: string[] }>(`/videos/${videoId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tagIds }),
    }),

  updateVideoMeta: (videoId: string, meta: Partial<VideoMeta>) =>
    request<VideoMeta>(`/videos/${videoId}/meta`, {
      method: 'PUT',
      body: JSON.stringify(meta),
    }),

  batchUpdateMeta: (updates: Record<string, Partial<VideoMeta>>) =>
    request<void>('/videos/batch-meta', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    }),

  getTags: () => request<Tag[]>('/tags'),
  createTag: (name: string, color: string) =>
    request<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name, color }) }),
  updateTag: (id: string, name: string, color: string) =>
    request<Tag>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name, color }) }),
  deleteTag: (id: string) =>
    request<void>(`/tags/${id}`, { method: 'DELETE' }),

  getScanPaths: () => request<string[]>('/scan-paths'),
  addScanPath: (path: string) =>
    request<string[]>('/scan-paths', { method: 'POST', body: JSON.stringify({ path }) }),
  removeScanPath: (path: string) =>
    request<string[]>('/scan-paths', { method: 'DELETE', body: JSON.stringify({ path }) }),

  getCountries: () => request<string[]>('/countries'),
  updateCountries: (countries: string[]) =>
    request<string[]>('/countries', { method: 'PUT', body: JSON.stringify({ countries }) }),
  getScenes: () => request<string[]>('/scenes'),
  updateScenes: (scenes: string[]) =>
    request<string[]>('/scenes', { method: 'PUT', body: JSON.stringify({ scenes }) }),
  getPersons: () => request<string[]>('/persons'),
  updatePersons: (persons: string[]) =>
    request<string[]>('/persons', { method: 'PUT', body: JSON.stringify({ persons }) }),
}

export function getVideoStreamUrl(videoId: string): string {
  return `/video-stream/${videoId}`
}

export function getThumbnailUrl(videoId: string): string {
  return `/api/thumbnails/${videoId}`
}

export async function uploadThumbnail(videoId: string, dataUrl: string): Promise<void> {
  await fetch(`/api/thumbnails/${videoId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  })
}

export type { VideoFile, Tag }