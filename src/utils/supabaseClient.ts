import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or API Key is missing in environment variables.');
}

// データベースの型を含むSupabaseクライアントを作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
