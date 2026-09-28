// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing in Vercel. Please add them in Settings > Environment Variables.');
}

// ვიყენებთ placeholder-ს მხოლოდ იმისთვის, რომ Build-მა არ ჩააგდოს "supabaseKey is required" შეცდომა
// რეალური მუშაობისთვის ცვლადები აუცილებლად უნდა იყოს Vercel-ში დამატებული
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);