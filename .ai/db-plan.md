# 10xCards Database Schema



## 1. Tabele



### 1.1. users



This table is managed by Supabase Auth (maps to `auth.users`).



- id: UUID PRIMARY KEY

- email: VARCHAR(255) NOT NULL UNIQUE

- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

- confirmed_at: TIMESTAMPTZ



### 1.2. flashcards



- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()

- front: VARCHAR(200) NOT NULL

- back: VARCHAR(500) NOT NULL

- source: VARCHAR NOT NULL CHECK (source IN ('ai-full', 'ai-edited', 'manual'))

- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()

- generation_id: UUID REFERENCES generations(id) ON DELETE SET NULL

- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE



*Trigger: Automatically update the `updated_at` column on record updates.*



### 1.3. generations



- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()

- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE

- source_text: TEXT NOT NULL

- source_text_length: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000) GENERATED ALWAYS AS (char_length(source_text)) STORED

- generated_count: INTEGER NOT NULL CHECK (generated_count >= 0)

- accepted_unedited_count: INTEGER NULLABLE CHECK (accepted_unedited_count >= 0)

- accepted_edited_count: INTEGER NULLABLE CHECK (accepted_edited_count >= 0)

- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()



### 1.4. generation_error_logs



- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()

- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE

- model: VARCHAR(100) NOT NULL

- source_text_hash: VARCHAR(128) NOT NULL

- source_text_length: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)

- error_code: VARCHAR(100) NOT NULL

- error_message: TEXT NOT NULL

- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()



## 2. Relacje



- Jeden użytkownik (users) ma wiele fiszek (flashcards).

- Jeden użytkownik (users) ma wiele rekordów w tabeli generations.

- Jeden użytkownik (users) ma wiele rekordów w tabeli generation_error_logs.

- Każda fiszka (flashcards) może opcjonalnie odnosić się do jednej generacji (generations) poprzez generation_id.



## 3. Indeksy



- Indeks na kolumnie `user_id` w tabeli flashcards.

- Indeks na kolumnie `generation_id` w tabeli flashcards.

- Indeks na kolumnie `user_id` w tabeli generations.

- Indeks na kolumnie `user_id` w tabeli generation_error_logs.



## 4. Zasady RLS (Row-Level Security)



- W tabelach flashcards, generations oraz generation_error_logs wdrożyć polityki RLS, które pozwalają użytkownikowi na dostęp tylko do rekordów, gdzie `user_id` odpowiada identyfikatorowi użytkownika z Supabase Auth (np. auth.uid() = user_id).



## 5. Dodatkowe uwagi



- Trigger w tabelach flashcards i generations automatycznie aktualizuje kolumnę `updated_at` przy każdej modyfikacji rekordu.

- Usunięcie użytkownika z `auth.users` skutkuje kaskadowym usunięciem powiązanych rekordów w `flashcards`, `generations` i `generation_error_logs`.

- Kolumna `source` jest zarządzana przez logikę aplikacyjną: zmiana z 'ai-full' na 'ai-edited' następuje przy pierwszej edycji fiszki.


