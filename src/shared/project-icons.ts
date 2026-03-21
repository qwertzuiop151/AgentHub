const PROJECT_ICONS: Record<string, string> = {
  AgentHub: '\u{1F916}',        // robot
  digestion: '\u{1F9EC}',       // dna
  GelEstimator: '\u{1F52E}',    // crystal ball
  LoLMonitor: '\u{1F3AE}',      // game controller
  Metaplaner: '\u{1F9E0}',      // brain
  MultifunctionalHotkey: '\u{2328}', // keyboard
  PaperSummary: '\u{1F4C4}',    // page
  PresentationBuilder: '\u{1F4FD}', // projector
  RemoteControl: '\u{1F4F1}',   // phone
  ResearchGraph: '\u{1F52C}',   // microscope
  seqaligner: '\u{1F9EC}',      // dna
  seqeditor: '\u{2702}',        // scissors
  Whisper: '\u{1F3A4}',         // microphone
}

const PROJECT_COLORS: Record<string, string> = {
  AgentHub: '#2d8a4e',
  digestion: '#7c3aed',
  GelEstimator: '#0ea5e9',
  LoLMonitor: '#dc2626',
  Metaplaner: '#2563eb',
  MultifunctionalHotkey: '#d97706',
  PaperSummary: '#0d9488',
  PresentationBuilder: '#9333ea',
  RemoteControl: '#e11d48',
  ResearchGraph: '#059669',
  seqaligner: '#6366f1',
  seqeditor: '#ca8a04',
  Whisper: '#ec4899',
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
