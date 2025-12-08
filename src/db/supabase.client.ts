import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Zmienne z prefixem PUBLIC_ są dostępne w przeglądarce
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

/**
 * Klient Supabase dla strony klienta (browser).
 * Używany przez komponenty React do operacji auth (login, logout, etc.)
 *
 * UWAGA: Dla operacji server-side (API, middleware) używaj createSupabaseServerInstance
 * z src/db/supabase.server.ts
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabaseClient;