import type { FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/db/database.types";

/**
 * Playwright global teardown.
 * Cleans up Supabase tables that are mutated by E2E runs.
 */
export default async function globalTeardown(_config: FullConfig) {
  const supabaseUrl =
    process.env.PLAYWRIGHT_SUPABASE_URL ??
    process.env.PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const supabaseKey =
    process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.PUBLIC_SUPABASE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[PlaywrightTeardown] Skipping DB cleanup because SUPABASE_URL/SUPABASE_KEY are missing.",
    );
    return;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const tables: Array<keyof Database["public"]["Tables"]> = [
    "flashcards",
    "generation_error_logs",
    "generations",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);

    if (error) {
      console.error(`[PlaywrightTeardown] Failed to clean ${table}: ${error.message}`);
      throw error;
    }
  }

  console.log("[PlaywrightTeardown] Database cleanup finished.");
}

