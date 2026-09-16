import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Database features will not work.');
}

const memory = new Map<string, string>();
const storage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') return memory.get(key) ?? null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    memory.set(key, value);
    if (typeof window === 'undefined') return;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    memory.delete(key);
    if (typeof window === 'undefined') return;
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
