import type { SupabaseClient } from "../db/supabase.client"
import type {
  CreateFlashcardsResponseDto,
  FlashcardDetailDto,
  FlashcardDraftCommand,
  FlashcardListQueryDto,
  FlashcardListResponseDto,
  UpdateFlashcardCommand,
} from "../types"

export type CreateFlashcardsParams = {
  supabase: SupabaseClient
  userId: string
  flashcards: FlashcardDraftCommand[]
}

export type ListFlashcardsParams = {
  supabase: SupabaseClient
  userId: string
  query: FlashcardListQueryDto
}

export type FlashcardServiceErrorCode =
  | "GENERATION_NOT_FOUND"
  | "FLASHCARDS_PERSISTENCE_FAILED"
  | "FLASHCARD_NOT_FOUND"
  | "INVALID_UPDATE_PAYLOAD"
  | "INVALID_GENERATION_LINK"

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

  async listFlashcards(params: ListFlashcardsParams): Promise<FlashcardListResponseDto> {
    const { supabase, userId, query } = params

    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const offset = (page - 1) * limit
    const sortColumn = query.sort ?? "created_at"
    const ascending = (query.order ?? "desc") === "asc"

    let builder = supabase
      .from("flashcards")
      .select("id, front, back, source, created_at, updated_at", { count: "exact" })
      .eq("user_id", userId)

    if (query.source) {
      builder = builder.eq("source", query.source)
    }

    if (query.generation_id) {
      builder = builder.eq("generation_id", query.generation_id)
    }

    const { data, error, count } = await builder
      .order(sortColumn, { ascending })
      .range(offset, offset + limit - 1)

    if (error || !data || typeof count !== "number") {
      throw new Error("Failed to list flashcards")
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        front: row.front,
        back: row.back,
        source: row.source,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: count,
      },
    }
  }

  async getFlashcardDetail(params: {
    supabase: SupabaseClient
    userId: string
    flashcardId: string
  }): Promise<FlashcardDetailDto | null> {
    const { supabase, userId, flashcardId } = params

    const { data, error } = await supabase
      .from("flashcards")
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw new Error("Failed to fetch flashcard")
    }

    if (!data) {
      return null
    }

    return {
      id: data.id,
      front: data.front,
      back: data.back,
      source: data.source,
      generation_id: data.generation_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  async updateFlashcard(params: {
    supabase: SupabaseClient
    userId: string
    flashcardId: string
    command: UpdateFlashcardCommand
  }): Promise<FlashcardDetailDto | null> {
    const { supabase, userId, flashcardId, command } = params

    const hasAnyField =
      command.front !== undefined ||
      command.back !== undefined ||
      command.source !== undefined ||
      command.generation_id !== undefined

    if (!hasAnyField) {
      throw new FlashcardServiceError(
        "No fields to update",
        "INVALID_UPDATE_PAYLOAD",
      )
    }

    const { data: current, error: currentError } = await supabase
      .from("flashcards")
      .select("id, source, generation_id")
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .maybeSingle()

    if (currentError) {
      throw new FlashcardServiceError(
        "Failed to fetch flashcard",
        "FLASHCARDS_PERSISTENCE_FAILED",
        currentError,
      )
    }

    if (!current) {
      return null
    }

    const aiSources = new Set<FlashcardDetailDto["source"]>([
      "ai-full",
      "ai-edited",
    ])

    const targetSource = command.source ?? (current.source as FlashcardDetailDto["source"])
    let targetGenerationId: string | null =
      current.generation_id as string | null

    if (command.source !== undefined) {
      if (command.source === "manual") {
        targetGenerationId = null
      } else {
        // source changed to AI → require generation_id provided as UUID
        if (typeof command.generation_id !== "string") {
          throw new FlashcardServiceError(
            "generation_id is required for AI sources",
            "INVALID_GENERATION_LINK",
          )
        }
        targetGenerationId = command.generation_id
      }
    } else if (command.generation_id !== undefined) {
      // Only generation_id changed
      const currentIsManual = current.source === "manual"
      if (currentIsManual) {
        throw new FlashcardServiceError(
          "Cannot set generation_id when source is manual",
          "INVALID_GENERATION_LINK",
        )
      }
      targetGenerationId = command.generation_id
    }

    // Enforce that AI sources cannot have null generation_id
    if (aiSources.has(targetSource) && (targetGenerationId === null || typeof targetGenerationId !== "string")) {
      throw new FlashcardServiceError(
        "generation_id is required for AI sources",
        "INVALID_GENERATION_LINK",
      )
    }

    // If a generation link is intended (non-null), verify ownership/existence
    if (typeof targetGenerationId === "string") {
      const { data: gen, error: genError } = await supabase
        .from("generations")
        .select("id")
        .eq("user_id", userId)
        .eq("id", targetGenerationId)
        .maybeSingle()

      if (genError) {
        throw new FlashcardServiceError(
          "Failed to verify generation ownership",
          "GENERATION_NOT_FOUND",
          genError,
        )
      }

      if (!gen) {
        throw new FlashcardServiceError(
          "Generation not found",
          "GENERATION_NOT_FOUND",
        )
      }
    }

    const updates: Record<string, unknown> = {}
    if (command.front !== undefined) updates.front = command.front
    if (command.back !== undefined) updates.back = command.back
    updates.source = targetSource
    updates.generation_id = targetGenerationId

    const { data: updated, error: updateError } = await supabase
      .from("flashcards")
      .update(updates)
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .maybeSingle()

    if (updateError) {
      throw new FlashcardServiceError(
        "Failed to update flashcard",
        "FLASHCARDS_PERSISTENCE_FAILED",
        updateError,
      )
    }

    if (!updated) {
      return null
    }

    return {
      id: updated.id,
      front: updated.front,
      back: updated.back,
      source: updated.source,
      generation_id: updated.generation_id,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    }
  }

  async deleteFlashcard(params: {
    supabase: SupabaseClient
    userId: string
    flashcardId: string
  }): Promise<boolean> {
    const { supabase, userId, flashcardId } = params

    const { data, error } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle()

    if (error) {
      throw new FlashcardServiceError(
        "Failed to delete flashcard",
        "FLASHCARDS_PERSISTENCE_FAILED",
        error,
      )
    }

    return !!data
  }
}

export const flashcardService = new FlashcardService()


