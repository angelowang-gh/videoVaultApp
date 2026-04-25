import { cn } from '@/lib/utils'

interface TagColor {
  name: string
  var: string
}

const TAG_COLORS: TagColor[] = [
  { name: 'red', var: '--tag-red' },
  { name: 'orange', var: '--tag-orange' },
  { name: 'yellow', var: '--tag-yellow' },
  { name: 'green', var: '--tag-green' },
  { name: 'teal', var: '--tag-teal' },
  { name: 'blue', var: '--tag-blue' },
  { name: 'indigo', var: '--tag-indigo' },
  { name: 'purple', var: '--tag-purple' },
  { name: 'pink', var: '--tag-pink' },
]

export function getTagColorStyle(colorName: string) {
  const c = TAG_COLORS.find(tc => tc.name === colorName)
  if (!c) return {}
  return {
    backgroundColor: `hsl(${getComputedColorVar(c.var)} / 0.15)`,
    color: `hsl(${getComputedColorVar(c.var)})`,
    borderColor: `hsl(${getComputedColorVar(c.var)} / 0.3)`,
  }
}

function getComputedColorVar(varName: string): string {
  // Return the CSS variable reference for use in inline styles
  return `var(${varName})`
}

interface TagBadgeProps {
  name: string
  color: string
  size?: 'sm' | 'md'
  removable?: boolean
  onRemove?: () => void
  onClick?: () => void
  selected?: boolean
}

export function TagBadge({ name, color, size = 'sm', removable, onRemove, onClick, selected }: TagBadgeProps) {
  const colorEntry = TAG_COLORS.find(c => c.name === color) || TAG_COLORS[5]

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-smooth",
        size === 'sm' ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        onClick && "cursor-pointer hover:opacity-80",
        selected && "ring-1 ring-offset-1 ring-offset-background"
      )}
      style={{
        backgroundColor: `hsl(var(${colorEntry.var}) / ${selected ? 0.25 : 0.12})`,
        color: `hsl(var(${colorEntry.var}))`,
        borderColor: `hsl(var(${colorEntry.var}) / ${selected ? 0.5 : 0.25})`,
        ...(selected ? { ringColor: `hsl(var(${colorEntry.var}))` } : {}),
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `hsl(var(${colorEntry.var}))` }}
      />
      {name}
      {removable && onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 hover:opacity-70"
        >
          &times;
        </button>
      )}
    </span>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {TAG_COLORS.map(c => (
        <button
          key={c.name}
          onClick={() => onChange(c.name)}
          className={cn(
            "h-6 w-6 rounded-full border-2 transition-smooth",
            value === c.name ? "border-foreground scale-110" : "border-transparent hover:scale-105"
          )}
          style={{ backgroundColor: `hsl(var(${c.var}))` }}
          title={c.name}
        />
      ))}
    </div>
  )
}