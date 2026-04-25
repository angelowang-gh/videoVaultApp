import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { RESOLUTION_OPTIONS, ORIENTATION_LABELS, DURATION_OPTIONS, DURATION_LABELS, type Orientation } from '@/lib/types'
import {
  Search, Grid3X3, List, Settings, Film, FolderOpen, Plus, RefreshCw,
  Monitor, Smartphone, Star, Globe, Clapperboard, Timer, Users, ChevronDown, X, Clock,
} from 'lucide-react'
import { Button } from './ui/button'
import { TagBadge } from './tag-badge'
import { cn } from '@/lib/utils'

// --- Collapsible sidebar section ---
function SidebarSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="px-3 pb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-smooth"
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn("h-3 w-3 transition-smooth", open ? "" : "-rotate-90")} />
      </button>
      {open && <div className="flex flex-col gap-0.5 pb-2">{children}</div>}
    </div>
  )
}

function FilterItem({ label, count, active, onClick }: {
  label: string; count?: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-smooth text-left",
        active ? "bg-surface text-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      )}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  )
}

function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn("transition-smooth", i <= value ? "text-[hsl(var(--tag-yellow))] fill-[hsl(var(--tag-yellow))]" : "text-muted-foreground/30")}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  )
}

// --- Sidebar ---
export function Sidebar() {
  const {
    tags, filters, setFilter, clearFilters,
    setShowSettings, videos, scanPaths,
    resolutionCounts, orientationCounts, ratingCounts,
    durationCounts, countryCounts, sceneCounts, personCounts, pathCounts,
  } = useApp()

  const hasActiveFilters = filters.selectedTagIds.length > 0 ||
    filters.selectedPath || filters.resolution || filters.orientation ||
    filters.rating !== null || filters.duration || filters.country ||
    filters.scene || filters.person

  const toggleTag = (id: string) => {
    const ids = filters.selectedTagIds.includes(id)
      ? filters.selectedTagIds.filter(t => t !== id)
      : [...filters.selectedTagIds, id]
    setFilter('selectedTagIds', ids)
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
          <Film className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground tracking-tight">VideoVault</h1>
          <p className="text-xs text-muted-foreground">{videos.length} videos</p>
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* All Videos + Clear */}
      <nav className="flex flex-col gap-1 px-3 pt-3 pb-1">
        <button
          onClick={clearFilters}
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-smooth",
            !hasActiveFilters
              ? "bg-surface text-foreground"
              : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            All Videos
          </span>
          <span className="text-xs text-muted-foreground">{videos.length}</span>
        </button>
      </nav>

      {/* Scrollable filters */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Scan Paths */}
        {scanPaths.length > 0 && (
          <SidebarSection title="Folders" icon={FolderOpen}>
            {scanPaths.map(sp => {
              const label = sp.split(/[/\\]/).filter(Boolean).pop() || sp
              return (
                <FilterItem
                  key={sp}
                  label={label}
                  count={pathCounts[sp] || 0}
                  active={filters.selectedPath === sp}
                  onClick={() => setFilter('selectedPath', filters.selectedPath === sp ? null : sp)}
                />
              )
            })}
          </SidebarSection>
        )}

        {/* Resolution */}
        <SidebarSection title="Resolution" icon={Monitor} defaultOpen={false}>
          {RESOLUTION_OPTIONS.map(r => (
            <FilterItem
              key={r}
              label={r}
              count={resolutionCounts[r] || 0}
              active={filters.resolution === r}
              onClick={() => setFilter('resolution', filters.resolution === r ? null : r)}
            />
          ))}
        </SidebarSection>

        {/* Orientation */}
        <SidebarSection title="Orientation" icon={Smartphone} defaultOpen={false}>
          {(['landscape', 'portrait', 'square'] as Orientation[]).map(o => (
            <FilterItem
              key={o}
              label={ORIENTATION_LABELS[o]}
              count={orientationCounts[o] || 0}
              active={filters.orientation === o}
              onClick={() => setFilter('orientation', filters.orientation === o ? null : o)}
            />
          ))}
        </SidebarSection>

        {/* Duration */}
        <SidebarSection title="Duration" icon={Timer} defaultOpen={false}>
          {DURATION_OPTIONS.map(d => (
            <FilterItem
              key={d}
              label={DURATION_LABELS[d]}
              count={durationCounts[d] || 0}
              active={filters.duration === d}
              onClick={() => setFilter('duration', filters.duration === d ? null : d)}
            />
          ))}
        </SidebarSection>

        {/* Star Rating */}
        <SidebarSection title="Rating" icon={Star} defaultOpen={false}>
          {[5, 4, 3, 2, 1].map(r => (
            <button
              key={r}
              onClick={() => setFilter('rating', filters.rating === r ? null : r as 1|2|3|4|5)}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-1.5 transition-smooth",
                filters.rating === r ? "bg-surface" : "hover:bg-surface-hover"
              )}
            >
              <StarRating value={r} />
              <span className="text-xs text-muted-foreground">{ratingCounts[r] || 0}</span>
            </button>
          ))}
          <FilterItem
            label="Unrated"
            count={ratingCounts[0] || 0}
            active={filters.rating === 0}
            onClick={() => setFilter('rating', filters.rating === 0 ? null : 0)}
          />
        </SidebarSection>

        {/* Country */}
        <SidebarSection title="Country" icon={Globe} defaultOpen={false}>
          {Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([c, count]) => (
              <FilterItem
                key={c}
                label={c}
                count={count}
                active={filters.country === c}
                onClick={() => setFilter('country', filters.country === c ? null : c)}
              />
            ))}
          {Object.keys(countryCounts).length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No countries assigned</p>
          )}
        </SidebarSection>

        {/* Scene */}
        <SidebarSection title="Scene" icon={Clapperboard} defaultOpen={false}>
          {Object.entries(sceneCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([s, count]) => (
              <FilterItem
                key={s}
                label={s}
                count={count}
                active={filters.scene === s}
                onClick={() => setFilter('scene', filters.scene === s ? null : s)}
              />
            ))}
          {Object.keys(sceneCounts).length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No scenes assigned</p>
          )}
        </SidebarSection>

        {/* Person */}
        <SidebarSection title="Person" icon={Users} defaultOpen={false}>
          {Object.entries(personCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([p, count]) => (
              <FilterItem
                key={p}
                label={p}
                count={count}
                active={filters.person === p}
                onClick={() => setFilter('person', filters.person === p ? null : p)}
              />
            ))}
          {Object.keys(personCounts).length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No persons assigned</p>
          )}
        </SidebarSection>

        {/* Tags */}
        <SidebarSection title="Tags" icon={Film}>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-smooth text-left",
                filters.selectedTagIds.includes(tag.id)
                  ? "bg-surface text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <TagBadge name={tag.name} color={tag.color} />
            </button>
          ))}
          {tags.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No tags yet</p>
          )}
        </SidebarSection>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="border-t border-border px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Active Filters</span>
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.selectedPath && (
              <FilterChip label={filters.selectedPath.split(/[/\\]/).pop() || ''} onRemove={() => setFilter('selectedPath', null)} />
            )}
            {filters.resolution && <FilterChip label={filters.resolution} onRemove={() => setFilter('resolution', null)} />}
            {filters.orientation && <FilterChip label={ORIENTATION_LABELS[filters.orientation]} onRemove={() => setFilter('orientation', null)} />}
            {filters.duration && <FilterChip label={DURATION_LABELS[filters.duration]} onRemove={() => setFilter('duration', null)} />}
            {filters.rating !== null && <FilterChip label={`${filters.rating} star`} onRemove={() => setFilter('rating', null)} />}
            {filters.country && <FilterChip label={filters.country} onRemove={() => setFilter('country', null)} />}
            {filters.scene && <FilterChip label={filters.scene} onRemove={() => setFilter('scene', null)} />}
            {filters.person && <FilterChip label={filters.person} onRemove={() => setFilter('person', null)} />}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => setShowSettings(true)}>
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </aside>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-foreground">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
    </span>
  )
}

// --- TopBar ---
export function TopBar() {
  const { filters, setFilter, viewMode, setViewMode, refreshVideos, setShowSettings, extractVideoDurations, videos } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractResult, setExtractResult] = useState<{ extracted: number; failed: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleRefresh = async () => { setIsRefreshing(true); await refreshVideos(); setIsRefreshing(false) }

  const handleExtractDurations = async () => {
    setIsExtracting(true)
    setExtractResult(null)
    try {
      const result = await extractVideoDurations()
      setExtractResult(result)
      // 3秒后清除结果提示
      setTimeout(() => setExtractResult(null), 3000)
    } catch (error) {
      console.error('提取时长失败:', error)
      setExtractResult({ extracted: 0, failed: videos.length })
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search videos...  Ctrl+K"
          value={filters.searchQuery}
          onChange={e => setFilter('searchQuery', e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-smooth"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh">
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleExtractDurations} 
          title="提取视频时长"
          disabled={isExtracting || videos.length === 0}
        >
          <Clock className={cn("h-4 w-4", isExtracting && "animate-pulse")} />
        </Button>
        <div className="flex rounded-lg border border-border bg-surface p-0.5">
          <button onClick={() => setViewMode('grid')} className={cn("rounded-md p-1.5 transition-smooth", viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={cn("rounded-md p-1.5 transition-smooth", viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Folder
        </Button>
      </div>
      
      {extractResult && (
        <div className="absolute right-4 top-16 z-10 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-card-hover animate-fade-in">
          {extractResult.extracted > 0 ? (
            <p className="text-green-600">
              成功提取 {extractResult.extracted} 个视频的时长
              {extractResult.failed > 0 && `，失败 ${extractResult.failed} 个`}
            </p>
          ) : (
            <p className="text-amber-600">
              未能提取任何视频时长，请确保视频文件可访问
            </p>
          )}
        </div>
      )}
    </header>
  )
}
