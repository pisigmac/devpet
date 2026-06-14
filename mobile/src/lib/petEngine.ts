import { Platform } from 'react-native';

export const STAGES = [
  { name: 'Egg', emoji: '🥚', minXp: 0, desc: 'A mysterious egg. Code to hatch it.' },
  { name: 'Hatchling', emoji: '🐣', minXp: 500, desc: 'Just born. Learning to crawl through code.' },
  { name: 'Junior', emoji: '🐛', minXp: 2000, desc: 'Growing fast. Exploring different languages.' },
  { name: 'Senior', emoji: '🦋', minXp: 8000, desc: 'Mature and confident. Shipping production code.' },
  { name: 'Architect', emoji: '🐉', minXp: 25000, desc: 'Legendary. Building systems that last.' },
];

export const MOODS = {
  happy: { label: 'Happy', color: '#6B8E5A', icon: '😊' },
  focused: { label: 'Focused', color: '#8A7A66', icon: '🤓' },
  tired: { label: 'Tired', color: '#C99A4D', icon: '😴' },
  neglected: { label: 'Neglected', color: '#B54B3F', icon: '😢' },
  excited: { label: 'Excited', color: '#C86B53', icon: '🤩' },
  neutral: { label: 'Neutral', color: '#9A8B80', icon: '😐' },
};

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  pet_name: string;
  pet_stage: number;
  pet_xp: number;
  pet_mood: string;
  current_streak: number;
  longest_streak: number;
  equipped_skin: string;
  equipped_badge: string | null;
  is_premium: boolean;
  updated_at: string;
}

export function getStage(xp: number) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (xp >= STAGES[i].minXp) return { ...STAGES[i], stage: i };
  }
  return { ...STAGES[0], stage: 0 };
}

export function getXpToNext(xp: number) {
  const current = getStage(xp);
  const next = STAGES[current.stage + 1];
  if (!next) return null;
  return {
    current: xp,
    target: next.minXp,
    remaining: next.minXp - xp,
    percent: Math.min(100, Math.floor((xp / next.minXp) * 100)),
  };
}

export function getMood(profile: Profile) {
  const lastActive = new Date(profile.updated_at).getTime();
  const hoursSince = (Date.now() - lastActive) / 3600000;

  if (hoursSince > 48) return 'neglected';
  if (hoursSince > 24) return 'tired';
  if (profile.current_streak > 7) return 'excited';
  if (profile.current_streak > 3) return 'happy';
  return profile.pet_mood || 'neutral';
}

export function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    javascript: '#D4A056',
    typescript: '#C86B53',
    python: '#7A8B6E',
    rust: '#B87333',
    go: '#5D8A8A',
    java: '#A06835',
    html: '#D97757',
    css: '#8A7A66',
    php: '#8B7A9E',
    ruby: '#A05050',
    swift: '#D98A4E',
    kotlin: '#9A6B8A',
  };
  return colors[lang?.toLowerCase()] || '#9A8B80';
}

export const SKIN_EFFECTS: Record<string, any> = {
  default: { glow: '#7c3aed', animation: 'pulse' },
  prod_neon: { glow: '#00ff88', animation: 'neon_pulse' },
  prod_gold: { glow: '#ffd700', animation: 'shimmer' },
};
