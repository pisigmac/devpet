import { Profile } from './supabase'

export const STAGES = [
  { name: 'Egg', emoji: '🥚', minXp: 0, desc: 'A mysterious egg. Code to hatch it.' },
  { name: 'Hatchling', emoji: '🐣', minXp: 500, desc: 'Just born. Learning to crawl through code.' },
  { name: 'Junior', emoji: '🐛', minXp: 2000, desc: 'Growing fast. Exploring different languages.' },
  { name: 'Senior', emoji: '🦋', minXp: 8000, desc: 'Mature and confident. Shipping production code.' },
  { name: 'Architect', emoji: '🐉', minXp: 25000, desc: 'Legendary. Building systems that last.' },
]

export const MOODS = {
  happy: { label: 'Happy', color: 'mood-happy', icon: '😊' },
  focused: { label: 'Focused', color: 'mood-focused', icon: '🤓' },
  tired: { label: 'Tired', color: 'mood-tired', icon: '😴' },
  neglected: { label: 'Neglected', color: 'mood-neglected', icon: '😢' },
  excited: { label: 'Excited', color: 'mood-excited', icon: '🤩' },
  neutral: { label: 'Neutral', color: '', icon: '😐' },
}

export function getStage(xp: number) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (xp >= STAGES[i].minXp) return { ...STAGES[i], stage: i }
  }
  return { ...STAGES[0], stage: 0 }
}

export function getXpToNext(xp: number) {
  const current = getStage(xp)
  const next = STAGES[current.stage + 1]
  if (!next) return null
  return {
    current: xp,
    target: next.minXp,
    remaining: next.minXp - xp,
    percent: Math.min(100, Math.floor((xp / next.minXp) * 100)),
  }
}

export function getMood(profile: Profile) {
  const lastActive = new Date(profile.updated_at).getTime()
  const hoursSince = (Date.now() - lastActive) / 3600000

  if (hoursSince > 48) return 'neglected'
  if (hoursSince > 24) return 'tired'
  if (profile.current_streak > 7) return 'excited'
  if (profile.current_streak > 3) return 'happy'
  return profile.pet_mood || 'neutral'
}

export function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    javascript: '#D4A056',
    typescript: '#C86B53',
    python: '#7A8B6E',
    rust: '#B87333',
    go: '#5D8A8A',
    java: '#A06835',
    'c++': '#B56A6A',
    html: '#D97757',
    css: '#8A7A66',
    php: '#8B7A9E',
    ruby: '#A05050',
    swift: '#D98A4E',
    kotlin: '#9A6B8A',
  }
  return colors[lang?.toLowerCase()] || '#9A8B80'
}
