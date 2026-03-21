// Example project icons — customize with your own project names.
// Projects not listed here get their first letter as icon and a color from the palette.
const PROJECT_ICONS: Record<string, string> = {
  // Add your projects: 'MyProject': '\u{1F680}',  // rocket
}

// Example project colors — customize with your own project names.
const PROJECT_COLORS: Record<string, string> = {
  // Add your projects: 'MyProject': '#2563eb',
}

const COLOR_PALETTE = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#0ea5e9', '#e11d48', '#ca8a04', '#9333ea', '#0d9488',
  '#6366f1', '#ec4899',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getProjectIcon(name: string): string {
  if (PROJECT_ICONS[name]) return PROJECT_ICONS[name]
  return name.charAt(0).toUpperCase()
}

export function getProjectColor(name: string): string {
  if (PROJECT_COLORS[name]) return PROJECT_COLORS[name]
  return COLOR_PALETTE[hashString(name) % COLOR_PALETTE.length]
}
