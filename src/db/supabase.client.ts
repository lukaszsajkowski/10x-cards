import { createClient } from "@supabase/supabase-js"

import type { Database } from "./database.types"

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_KEY

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
)

export type SupabaseClient = typeof supabaseClient

export const DEFAULT_USER_ID = "c0802f57-92e4-4673-8904-de11d89c0d7f"