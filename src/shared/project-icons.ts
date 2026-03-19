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

const DEFAULT_ICON = '\u{1F4C2}' // folder

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

const DEFAULT_COLOR = '#475569'

export function getProjectIcon(name: string): string {
  return PROJECT_ICONS[name] || DEFAULT_ICON
}

export function getProjectColor(name: string): string {
  return PROJECT_COLORS[name] || DEFAULT_COLOR
}
