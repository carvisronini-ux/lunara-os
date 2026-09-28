// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ✅ განახლებულია: ემთხვევა .env ფაილში არსებულ ცვლადების სახელებს
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);