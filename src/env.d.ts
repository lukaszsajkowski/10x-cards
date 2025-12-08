/// <reference types="astro/client" />

import type { SupabaseServerClient } from "./db/supabase.server";

/**
 * Typ użytkownika dostępny w Astro.locals
 */
export interface LocalsUser {
  id: string;
  email: string;
}

declare global {
  namespace App {
    interface Locals {
      /** Klient Supabase SSR z obsługą cookies */
      supabase: SupabaseServerClient;
      /** Zalogowany użytkownik lub null */
      user: LocalsUser | null;
    }
  }
}
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
