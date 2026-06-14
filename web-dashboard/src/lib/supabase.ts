import { createClient } from '@supabase/supabase-js'
import { createLocalClient } from './localSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

let realClient: ReturnType<typeof createClient> | null = null
let localClient: any = null

export async function initSupabase() {
  if (supabaseConfigured) {
    realClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  } else {
    localClient = await createLocalClient()
  }
}

export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const client = supabaseConfigured ? realClient : localClient
    if (!client) {
      throw new Error('Supabase client not initialized. Call initSupabase() first.')
    }
    return (client as any)[prop]
  },
})

export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  pet_name: string
  pet_stage: number
  pet_xp: number
  pet_mood: string
  current_streak: number
  longest_streak: number
  preferred_theme: string
  created_at: string
  updated_at: string
}

export type CodingEvent = {
  id: string
  user_id: string
  event_type: string
  language: string | null
  repo_name: string | null
  file_path: string | null
  xp_value: number
  metadata: Record<string, unknown>
  created_at: string
}

export type Friend = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'blocked'
  friend_code: string
  created_at: string
}
