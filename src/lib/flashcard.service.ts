import type { SupabaseClient } from "../db/supabase.client"
import type {
  CreateFlashcardsResponseDto,
  FlashcardDetailDto,
  FlashcardDraftCommand,
} from "../types"

export type CreateFlashcardsParams = {
  supabase: SupabaseClient
  userId: string
  flashcards: FlashcardDraftCommand[]
}

export type FlashcardServiceErrorCode =
  | "GENERATION_NOT_FOUND"
  | "FLASHCARDS_PERSISTENCE_FAILED"

export class FlashcardServiceError extends Error {
  constructor(
    message: string,
    public readonly code: FlashcardServiceErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "FlashcardServiceError"
  }
}

export class FlashcardService {
  async createFlashcards(
    params: CreateFlashcardsParams,
  ): Promise<CreateFlashcardsResponseDto> {
    const { supabase, userId, flashcards } = params

    const aiSources = new Set<FlashcardDraftCommand["source"]>([
      "ai-full",
      "ai-edited",
    ])

    const requiredGenerationIds = Array.from(
      new Set(
        flashcards
          .filter((fc) => aiSources.has(fc.source) && fc.generation_id)
          .map((fc) => fc.generation_id!) as string[],
      ),
    )

    if (requiredGenerationIds.length > 0) {
      const { data: generations, error: genError } = await supabase
        .from("generations")
        .select("id")
        .eq("user_id", userId)
        .in("id", requiredGenerationIds)

      if (genError) {
        throw new FlashcardServiceError(
          "Failed to verify generation ownership",
          "GENERATION_NOT_FOUND",
          genError,
        )
      }

      const foundIds = new Set((generations ?? []).map((g) => g.id as string))
      const missing = requiredGenerationIds.filter((id) => !foundIds.has(id))
      if (missing.length > 0) {
        throw new FlashcardServiceError(
          "Generation not found",
          "GENERATION_NOT_FOUND",
        )
      }
    }

    const rowsToInsert = flashcards.map((fc) => ({
      user_id: userId,
      front: fc.front,
      back: fc.back,
      source: fc.source,
      generation_id: fc.generation_id,
    }))

    const { data, error } = await supabase
      .from("flashcards")
      .insert(rowsToInsert)
      .select("id, front, back, source, generation_id, created_at, updated_at")

    if (error || !data || data.length === 0) {
      throw new FlashcardServiceError(
        "Failed to create flashcards",
        "FLASHCARDS_PERSISTENCE_FAILED",
        error,
      )
    }

    const result: FlashcardDetailDto[] = data.map((row) => ({
      id: row.id,
      front: row.front,
      back: row.back,
      source: row.source,
      generation_id: row.generation_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    return { flashcards: result }
  }
}

export const flashcardService = new FlashcardService()


