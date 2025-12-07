import { createHash } from "node:crypto"

import { z } from "zod"

import type { SupabaseClient } from "../db/supabase.client"
import type {
  CreateGenerationResponseDto,
  GenerationFlashcardProposalDto,
  GenerationListResponseDto,
  GenerationDetailDto,
  GenerationErrorLogListResponseDto,
} from "../types"
import { openRouterService } from "./openrouter.service"

export type CreateGenerationParams = {
  supabase: SupabaseClient
  userId: string
  sourceText: string
}

export type ListGenerationsParams = {
  supabase: SupabaseClient
  userId: string
  page: number
  limit: number
  order: "asc" | "desc"
}

export type GetGenerationDetailParams = {
  supabase: SupabaseClient
  userId: string
  generationId: string
}

export type ListGenerationErrorLogsParams = {
  supabase: SupabaseClient
  userId: string
  page: number
  limit: number
  order: "asc" | "desc"
}

export type GenerationServiceErrorCode =
  | "AI_GENERATION_FAILED"
  | "GENERATION_PERSISTENCE_FAILED"

export class GenerationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: GenerationServiceErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "GenerationServiceError"
  }
}

const MODEL_NAME = "openai/gpt-4o-mini"
const MAX_ERROR_MESSAGE_LENGTH = 500

// Zod schema for AI response validation
const flashcardProposalsSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(1).max(200),
        back: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(10),
})

type FlashcardProposals = z.infer<typeof flashcardProposalsSchema>

export class GenerationService {
  async createGeneration(
    params: CreateGenerationParams,
  ): Promise<CreateGenerationResponseDto> {
    const { supabase, userId, sourceText } = params

    let proposals: GenerationFlashcardProposalDto[]

    try {
      proposals = await this.generateFlashcards(sourceText)
    } catch (error) {
      const serviceError =
        error instanceof GenerationServiceError ? error : undefined

      await this.logGenerationError({
        supabase,
        userId,
        sourceText,
        error,
        errorCode: serviceError?.code ?? "AI_GENERATION_FAILED",
      })

      throw serviceError ??
        new GenerationServiceError(
          "Failed to generate flashcard proposals",
          "AI_GENERATION_FAILED",
          error,
        )
    }

    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        source_text: sourceText,
        generated_count: proposals.length,
      })
      .select("id, generated_count")
      .single()

    if (error || !data) {
      await this.logGenerationError({
        supabase,
        userId,
        sourceText,
        error: error ?? new Error("Generation insert returned empty data"),
        errorCode: "GENERATION_PERSISTENCE_FAILED",
      })

      throw new GenerationServiceError(
        "Failed to persist generation metadata",
        "GENERATION_PERSISTENCE_FAILED",
        error,
      )
    }

    return {
      generation_id: data.id,
      flashcards_proposals: proposals,
      generated_count: data.generated_count,
    }
  }

  async listGenerations(
    params: ListGenerationsParams,
  ): Promise<GenerationListResponseDto> {
    const { supabase, userId, page, limit, order } = params

    const offset = (page - 1) * limit
    const ascending = order === "asc"

    const { data, error, count } = await supabase
      .from("generations")
      .select(
        "id, generated_count, accepted_edited_count, accepted_unedited_count, source_text_length, created_at, updated_at",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("created_at", { ascending })
      .range(offset, offset + limit - 1)

    if (error || !data || typeof count !== "number") {
      throw new Error("Failed to list generations")
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        generated_count: row.generated_count,
        accepted_edited_count: row.accepted_edited_count,
        accepted_unedited_count: row.accepted_unedited_count,
        source_text_length: row.source_text_length,
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

  async listGenerationErrorLogs(
    params: ListGenerationErrorLogsParams,
  ): Promise<GenerationErrorLogListResponseDto> {
    const { supabase, userId, page, limit, order } = params

    const offset = (page - 1) * limit
    const ascending = order === "asc"

    const { data, error, count } = await supabase
      .from("generation_error_logs")
      .select(
        "id, model, source_text_hash, source_text_length, error_code, error_message, created_at",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("created_at", { ascending })
      .range(offset, offset + limit - 1)

    if (error || !data || typeof count !== "number") {
      throw new Error("Failed to list generation error logs")
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        model: row.model,
        source_text_hash: row.source_text_hash,
        source_text_length: row.source_text_length,
        error_code: row.error_code,
        error_message: row.error_message,
        created_at: row.created_at,
      })),
      pagination: {
        page,
        limit,
        total: count,
      },
    }
  }

  async getGenerationDetail(
    params: GetGenerationDetailParams,
  ): Promise<GenerationDetailDto | null> {
    const { supabase, userId, generationId } = params

    const { data: generationRow, error: generationError } = await supabase
      .from("generations")
      .select(
        "id, source_text, source_text_length, generated_count, accepted_edited_count, accepted_unedited_count, created_at, updated_at",
      )
      .eq("id", generationId)
      .eq("user_id", userId)
      .maybeSingle()

    if (generationError) {
      throw new Error("Failed to fetch generation")
    }

    if (!generationRow) {
      return null
    }

    const {
      data: flashcardsData,
      error: flashcardsError,
    } = await supabase
      .from("flashcards")
      .select(
        "id, front, back, source, created_at, updated_at, generation_id",
      )
      .eq("generation_id", generationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (flashcardsError || !flashcardsData) {
      throw new Error("Failed to fetch flashcards")
    }

    return {
      id: generationRow.id,
      source_text: generationRow.source_text,
      source_text_length: generationRow.source_text_length,
      generated_count: generationRow.generated_count,
      accepted_edited_count: generationRow.accepted_edited_count,
      accepted_unedited_count: generationRow.accepted_unedited_count,
      created_at: generationRow.created_at,
      updated_at: generationRow.updated_at,
      flashcards: flashcardsData.map((row) => ({
        id: row.id,
        front: row.front,
        back: row.back,
        source: row.source,
        created_at: row.created_at,
        updated_at: row.updated_at,
        generation_id: row.generation_id,
      })),
    }
  }

  private async generateFlashcards(
    sourceText: string,
  ): Promise<GenerationFlashcardProposalDto[]> {
    if (!openRouterService) {
      throw new GenerationServiceError(
        "OpenRouter service is not configured. Please set OPENROUTER_API_KEY environment variable.",
        "AI_GENERATION_FAILED",
      )
    }

    const systemMessage = `Jesteś ekspertem w tworzeniu fiszek edukacyjnych. 
Twoim zadaniem jest analiza dostarczonego tekstu i wygenerowanie zestawu fiszek.

Zasady tworzenia fiszek:
1. Każda fiszka powinna testować jedną konkretną informację
2. Pytania (front) powinny być jasne i jednoznaczne (max 200 znaków)
3. Odpowiedzi (back) powinny być zwięzłe, ale kompletne (max 500 znaków)
4. Unikaj pytań zbyt ogólnych lub zbyt szczegółowych
5. Wygeneruj od 3 do 10 fiszek w zależności od ilości materiału
6. Twórz fiszki w języku tekstu źródłowego

Format odpowiedzi: JSON z tablicą fiszek.`

    const userMessage = `Wygeneruj fiszki edukacyjne na podstawie poniższego tekstu:

${sourceText}`

    try {
      const result = await openRouterService.chatCompletion<FlashcardProposals>({
        systemMessage,
        userMessage,
        responseSchema: {
          name: "flashcard_proposals",
          schema: flashcardProposalsSchema,
        },
        model: MODEL_NAME,
        temperature: 0.7,
      })

      return result.flashcards.map((flashcard) => ({
        front: flashcard.front,
        back: flashcard.back,
        source: "ai-full" as const,
      }))
    } catch (error) {
      throw new GenerationServiceError(
        "Failed to generate flashcard proposals",
        "AI_GENERATION_FAILED",
        error,
      )
    }
  }

  private async logGenerationError(params: {
    supabase: SupabaseClient
    userId: string
    sourceText: string
    error: unknown
    errorCode: GenerationServiceErrorCode
  }) {
    const { supabase, userId, sourceText, error, errorCode } = params

    const errorMessage = this.truncateText(
      this.extractErrorMessage(error),
      MAX_ERROR_MESSAGE_LENGTH,
    )

    const insertResult = await supabase.from("generation_error_logs").insert({
      user_id: userId,
      error_code: errorCode,
      error_message: errorMessage,
      model: MODEL_NAME,
      source_text_hash: this.computeSourceTextHash(sourceText),
      source_text_length: sourceText.length,
    })

    if (insertResult.error) {
      console.error(
        "Failed to insert generation error log",
        insertResult.error.message,
      )
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof GenerationServiceError && error.cause) {
      return this.extractErrorMessage(error.cause)
    }

    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === "string") {
      return error
    }

    return "Unknown error"
  }

  private computeSourceTextHash(sourceText: string): string {
    return createHash("md5").update(sourceText).digest("hex")
  }

  private truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value
    }

    return `${value.slice(0, maxLength - 3)}...`
  }
}

export const generationService = new GenerationService()

