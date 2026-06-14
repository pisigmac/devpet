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
    javascript: '#f7df1e',
    typescript: '#3178c6',
    python: '#3776ab',
    rust: '#dea584',
    go: '#00add8',
    java: '#b07219',
    'c++': '#f34b7d',
    html: '#e34c26',
    css: '#563d7c',
    php: '#4F5D95',
    ruby: '#701516',
    swift: '#ffac45',
    kotlin: '#A97BFF',
  }
  return colors[lang?.toLowerCase()] || '#7c3aed'
}
