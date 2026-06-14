import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
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
};

export type CodingEvent = {
  id: string;
  user_id: string;
  event_type: string;
  language: string | null;
  xp_value: number;
  created_at: string;
};
