-- migration: disable_rls_policies
-- description: disables row level security on generations, flashcards, and generation_error_logs tables.
-- created_at: 2025-11-02 18:00:00 utc

alter table public.generations disable row level security;
alter table public.flashcards disable row level security;
alter table public.generation_error_logs disable row level security;
