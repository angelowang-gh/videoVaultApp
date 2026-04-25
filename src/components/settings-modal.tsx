import { useState } from 'react'
import { useApp } from '@/lib/store'
import { X, FolderPlus, Trash2, Plus, Tag, FolderOpen, Globe, Clapperboard, Users } from 'lucide-react'
import { Button } from './ui/button'
import { TagBadge, ColorPicker } from './tag-badge'
import { toast } from './ui/toast'

export function SettingsModal() {
  const {
    showSettings, setShowSettings,
    scanPaths, addScanPath, removeScanPath,
    tags, addTag, updateTag, deleteTag,
    countries, updateCountries,
    scenes, updateScenes,
    persons, updatePersons,
  } = useApp()

  if (!showSettings) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-card-hover overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-8">
          {/* Scan Paths */}
          <ScanPathsSection
            scanPaths={scanPaths}
            onAdd={addScanPath}
            onRemove={removeScanPath}
          />

          {/* Tag Management */}
          <TagManagementSection
            tags={tags}
            onAdd={addTag}
            onUpdate={updateTag}
            onDelete={deleteTag}
          />

          {/* Country List */}
          <ListManagementSection
            icon={<Globe className="h-5 w-5 text-primary" />}
            title="Countries"
            description="Manage country classification options for videos."
            items={countries}
            onUpdate={updateCountries}
          />

          {/* Scene List */}
          <ListManagementSection
            icon={<Clapperboard className="h-5 w-5 text-primary" />}
            title="Scenes"
            description="Manage scene/category classification options for videos."
            items={scenes}
            onUpdate={updateScenes}
          />

          {/* Person List */}
          <ListManagementSection
            icon={<Users className="h-5 w-5 text-primary" />}
            title="Persons"
            description="Manage person/character classification options for videos."
            items={persons}
            onUpdate={updatePersons}
          />
        </div>
      </div>
    </div>
  )
}

function ScanPathsSection({
  scanPaths,
  onAdd,
  onRemove,
}: {
  scanPaths: string[]
  onAdd: (path: string) => Promise<void>
  onRemove: (path: string) => Promise<void>
}) {
  const [newPath, setNewPath] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!newPath.trim()) return
    setIsAdding(true)
    try {
      await onAdd(newPath.trim())
      setNewPath('')
      toast('Folder added and scanned', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add folder', 'error')
    }
    setIsAdding(false)
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Video Folders</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Add folders containing video files. All subdirectories will be scanned.
      </p>

      {/* Add new path */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter folder path, e.g. D:\Videos"
          value={newPath}
          onChange={e => setNewPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-smooth"
        />
        <Button onClick={handleAdd} disabled={isAdding || !newPath.trim()} size="sm">
          <FolderPlus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Path list */}
      <div className="space-y-2">
        {scanPaths.map(p => (
          <div key={p} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate">{p}</span>
            </div>
            <button
              onClick={() => { onRemove(p); toast('Folder removed', 'info') }}
              className="ml-2 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {scanPaths.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No folders added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add a folder to start scanning for videos</p>
          </div>
        )}
      </div>
    </section>
  )
}

function TagManagementSection({
  tags,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tags: Array<{ id: string; name: string; color: string }>
  onAdd: (name: string, color: string) => Promise<void>
  onUpdate: (id: string, name: string, color: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('blue')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    await onAdd(newName.trim(), newColor)
    setNewName('')
    setNewColor('blue')
    setShowCreate(false)
    toast('Tag created', 'success')
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return
    await onUpdate(id, editName.trim(), editColor)
    setEditId(null)
    toast('Tag updated', 'success')
  }

  const startEdit = (tag: { id: string; name: string; color: string }) => {
    setEditId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tags</h3>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Tag
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-4 space-y-3 animate-fade-in">
          <input
            type="text"
            placeholder="Tag name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-smooth"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Tag list */}
      <div className="space-y-2">
        {tags.map(tag => (
          <div key={tag.id} className="rounded-lg border border-border bg-surface p-3">
            {editId === tag.id ? (
              <div className="space-y-3 animate-fade-in">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(tag.id)}
                  autoFocus
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-smooth"
                />
                <ColorPicker value={editColor} onChange={setEditColor} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUpdate(tag.id)}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <TagBadge name={tag.name} color={tag.color} size="md" />
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(tag)}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-smooth"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { onDelete(tag.id); toast('Tag deleted', 'info') }}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {tags.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-6 py-6 text-center">
            <Tag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tags yet</p>
          </div>
        )}
      </div>
    </section>
  )
}

function ListManagementSection({
  icon,
  title,
  description,
  items,
  onUpdate,
}: {
  icon: React.ReactNode
  title: string
  description: string
  items: string[]
  onUpdate: (list: string[]) => Promise<void>
}) {
  const [newItem, setNewItem] = useState('')

  const handleAdd = async () => {
    const val = newItem.trim()
    if (!val || items.includes(val)) return
    await onUpdate([...items, val])
    setNewItem('')
    toast(`${title} item added`, 'success')
  }

  const handleRemove = async (item: string) => {
    await onUpdate(items.filter(i => i !== item))
    toast(`${title} item removed`, 'info')
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>

      {/* Add new */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={`Add new ${title.toLowerCase()} item`}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-smooth"
        />
        <Button onClick={handleAdd} disabled={!newItem.trim()} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* List */}
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <div
            key={item}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
          >
            <span>{item}</span>
            <button
              onClick={() => handleRemove(item)}
              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">No items yet. Add some above.</p>
        )}
      </div>
    </section>
  )
}
