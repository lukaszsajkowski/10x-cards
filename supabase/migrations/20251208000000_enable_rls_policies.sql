-- migration: enable_rls_policies
-- description: enables row level security on generations, flashcards, and generation_error_logs tables.
-- created_at: 2025-12-08

alter table public.generations enable row level security;
alter table public.flashcards enable row level security;
alter table public.generation_error_logs enable row level security;
