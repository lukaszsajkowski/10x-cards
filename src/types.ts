import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./db/database.types"

/**
 * Helper aliases to keep DTOs tightly coupled to Supabase-generated models.
 */
type FlashcardRow = Tables<"flashcards">
type FlashcardInsert = TablesInsert<"flashcards">
type FlashcardUpdate = TablesUpdate<"flashcards">
type GenerationRow = Tables<"generations">
type GenerationInsert = TablesInsert<"generations">
type GenerationErrorLogRow = Tables<"generation_error_logs">

/**
 * Common pagination payload shared by list endpoints.
 */
export type PaginationMetaDto = {
  page: number
  limit: number
  total: number
}

/**
 * Query model for listing flashcards (`GET /flashcards`).
 * Optional properties reflect filter/query string behaviour.
 */
export type FlashcardListQueryDto = {
  page?: number
  limit?: number
  sort?: "created_at"
  order?: "asc" | "desc"
  source?: FlashcardRow["source"]
  generation_id?: FlashcardRow["generation_id"]
}

/**
 * Flashcard representation used in list responses.
 */
export type FlashcardListItemDto = Pick<
  FlashcardRow,
  "id" | "front" | "back" | "source" | "created_at" | "updated_at"
>

/**
 * Flashcard representation used when returning a single flashcard or mutation result.
 */
export type FlashcardDetailDto = FlashcardListItemDto &
  Pick<FlashcardRow, "generation_id">

/**
 * List response combining flashcard data and pagination metadata.
 */
export type FlashcardListResponseDto = {
  data: FlashcardListItemDto[]
  pagination: PaginationMetaDto
}

/**
 * Command payload for creating flashcards (`POST /flashcards`).
 * Based on the insert model but excludes server-managed fields such as `user_id`.
 */
export type FlashcardDraftCommand = Pick<
  FlashcardInsert,
  "front" | "back" | "source" | "generation_id"
>

export type CreateFlashcardsCommand = {
  flashcards: FlashcardDraftCommand[]
}

/**
 * Response payload for successful flashcard creation.
 */
export type CreateFlashcardsResponseDto = {
  flashcards: FlashcardDetailDto[]
}

/**
 * Command payload for updating a flashcard (`PUT /flashcards/{id}`).
 * `TablesUpdate` already marks fields as optional, so no extra `Partial` is required.
 */
export type UpdateFlashcardCommand = Pick<
  FlashcardUpdate,
  "front" | "back" | "source" | "generation_id"
>

export type UpdateFlashcardResponseDto = FlashcardDetailDto

/**
 * Minimal delete confirmation payload kept generic for flexibility across clients.
 */
export type DeleteFlashcardResponseDto = {
  message: string
}

/**
 * Command payload for initiating a generation request (`POST /generations`).
 */
export type CreateGenerationCommand = Pick<
  GenerationInsert,
  "source_text"
>

/**
 * Flashcard proposal returned alongside generation metadata.
 */
export type GenerationFlashcardProposalDto = Pick<
  FlashcardInsert,
  "front" | "back" | "source"
>

export type CreateGenerationResponseDto = {
  generation_id: GenerationRow["id"]
  flashcards_proposals: GenerationFlashcardProposalDto[]
  generated_count: GenerationRow["generated_count"]
}

/**
 * Summary representation for generation listings (`GET /generations`).
 * Accepted counts may be null in the database, so they are surfaced directly.
 */
export type GenerationSummaryDto = Pick<
  GenerationRow,
  | "id"
  | "generated_count"
  | "accepted_edited_count"
  | "accepted_unedited_count"
  | "source_text_length"
  | "created_at"
  | "updated_at"
>

export type GenerationListResponseDto = {
  data: GenerationSummaryDto[]
  pagination: PaginationMetaDto
}

/**
 * Query model for generation listings (`GET /generations`).
 */
export type GenerationListQueryDto = {
  page?: number
  limit?: number
  order?: "asc" | "desc"
}

/**
 * Query model for generation error logs listings (`GET /generation-error-logs`).
 */
export type GenerationErrorLogListQueryDto = {
  page?: number
  limit?: number
  order?: "asc" | "desc"
  user_id?: string
}

/**
 * Detailed representation of a single generation including its flashcards.
 * Excludes `user_id` because it is handled by authentication context.
 */
export type GenerationDetailDto = Omit<GenerationRow, "user_id"> & {
  flashcards: FlashcardDetailDto[]
}

/**
 * Summary of generation errors, omitting `user_id` for security reasons.
 */
export type GenerationErrorLogDto = Omit<
  GenerationErrorLogRow,
  "user_id"
>

export type GenerationErrorLogListResponseDto = {
  data: GenerationErrorLogDto[]
  pagination?: PaginationMetaDto
}

