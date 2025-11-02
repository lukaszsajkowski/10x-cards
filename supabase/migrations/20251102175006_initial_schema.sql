-- migration: initial_schema
-- description: creates initial tables for flashcards, generations, and generation_error_logs, along with triggers, indexes, and rls policies.
-- created_at: 2025-11-02 17:50:06 utc

--
-- create generations table
--
create table public.generations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    source_text text not null,
    source_text_length integer not null generated always as (char_length(source_text)) stored,
    generated_count integer not null check (generated_count >= 0),
    accepted_unedited_count integer check (accepted_unedited_count >= 0),
    accepted_edited_count integer check (accepted_edited_count >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint source_text_length_check check (char_length(source_text) between 1000 and 10000)
);

comment on table public.generations is 'stores information about each generation of flashcards from a source text.';

--
-- create flashcards table
--
create table public.flashcards (
    id uuid primary key default gen_random_uuid(),
    front varchar(200) not null,
    back varchar(500) not null,
    source varchar not null check (source in ('ai-full', 'ai-edited', 'manual')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    generation_id uuid references public.generations(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade
);

comment on table public.flashcards is 'stores individual flashcards created by users, either manually or through ai generation.';


--
-- create generation_error_logs table
--
create table public.generation_error_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    model varchar(100) not null,
    source_text_hash varchar(128) not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text not null,
    created_at timestamptz not null default now()
);

comment on table public.generation_error_logs is 'logs errors that occur during the ai flashcard generation process.';

--
-- trigger function to update updated_at column
--
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

--
-- trigger for generations
--
create trigger on_generations_update
before update on public.generations
for each row
execute procedure public.handle_updated_at();

--
-- trigger for flashcards
--
create trigger on_flashcards_update
before update on public.flashcards
for each row
execute procedure public.handle_updated_at();


--
-- indexes
--
create index on public.generations (user_id);
create index on public.flashcards (user_id);
create index on public.flashcards (generation_id);
create index on public.generation_error_logs (user_id);

--
-- rls policies for generations
--
alter table public.generations enable row level security;

-- authenticated users
create policy "allow select for own generations" on public.generations for select to authenticated using (auth.uid() = user_id);
create policy "allow insert for own generations" on public.generations for insert to authenticated with check (auth.uid() = user_id);
create policy "allow update for own generations" on public.generations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "allow delete for own generations" on public.generations for delete to authenticated using (auth.uid() = user_id);

-- anon users
create policy "disallow select for anon on generations" on public.generations for select to anon using (false);
create policy "disallow insert for anon on generations" on public.generations for insert to anon with check (false);
create policy "disallow update for anon on generations" on public.generations for update to anon using (false) with check (false);
create policy "disallow delete for anon on generations" on public.generations for delete to anon using (false);

--
-- rls policies for flashcards
--
alter table public.flashcards enable row level security;

-- authenticated users
create policy "allow select for own flashcards" on public.flashcards for select to authenticated using (auth.uid() = user_id);
create policy "allow insert for own flashcards" on public.flashcards for insert to authenticated with check (auth.uid() = user_id);
create policy "allow update for own flashcards" on public.flashcards for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "allow delete for own flashcards" on public.flashcards for delete to authenticated using (auth.uid() = user_id);

-- anon users
create policy "disallow select for anon on flashcards" on public.flashcards for select to anon using (false);
create policy "disallow insert for anon on flashcards" on public.flashcards for insert to anon with check (false);
create policy "disallow update for anon on flashcards" on public.flashcards for update to anon using (false) with check (false);
create policy "disallow delete for anon on flashcards" on public.flashcards for delete to anon using (false);

--
-- rls policies for generation_error_logs
--
alter table public.generation_error_logs enable row level security;

-- authenticated users
create policy "allow select for own generation_error_logs" on public.generation_error_logs for select to authenticated using (auth.uid() = user_id);
create policy "allow insert for own generation_error_logs" on public.generation_error_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "allow update for own generation_error_logs" on public.generation_error_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "allow delete for own generation_error_logs" on public.generation_error_logs for delete to authenticated using (auth.uid() = user_id);

-- anon users
create policy "disallow select for anon on generation_error_logs" on public.generation_error_logs for select to anon using (false);
create policy "disallow insert for anon on generation_error_logs" on public.generation_error_logs for insert to anon with check (false);
create policy "disallow update for anon on generation_error_logs" on public.generation_error_logs for update to anon using (false) with check (false);
create policy "disallow delete for anon on generation_error_logs" on public.generation_error_logs for delete to anon using (false);
