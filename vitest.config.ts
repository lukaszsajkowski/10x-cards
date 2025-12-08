import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    // Test environment configuration
    environment: "jsdom",

    // Setup files
    setupFiles: ["./src/test/setup.ts"],

    // Include patterns for test files
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    // Exclude patterns
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types.ts",
        "src/components/ui/**", // Shadcn components
        "src/db/database.types.ts", // Generated Supabase types
      ],
    },

    // Reporter configuration
    reporters: ["verbose"],

    // Test timeout
    testTimeout: 10000,

    // Pool configuration - use forks for better stability
    pool: "forks",

    // Enable type checking in tests
    typecheck: {
      enabled: false, // Enable when needed: slower but catches type errors
    },
  },
});
