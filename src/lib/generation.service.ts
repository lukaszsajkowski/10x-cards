import { createHash } from "node:crypto"

import type { SupabaseClient } from "../db/supabase.client"
import type {
  CreateGenerationResponseDto,
  GenerationFlashcardProposalDto,
} from "../types"

export type CreateGenerationParams = {
  supabase: SupabaseClient
  userId: string
  sourceText: string
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

const MODEL_NAME = "mock-ai-v1"
const MAX_ERROR_MESSAGE_LENGTH = 500
const MAX_FRONT_LENGTH = 120
const MAX_BACK_LENGTH = 320

export class GenerationService {
  async createGeneration(
    params: CreateGenerationParams,
  ): Promise<CreateGenerationResponseDto> {
    const { supabase, userId, sourceText } = params

    let proposals: GenerationFlashcardProposalDto[]

    try {
      proposals = await this.generateWithMockAi(sourceText)
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

  private async generateWithMockAi(
    sourceText: string,
  ): Promise<GenerationFlashcardProposalDto[]> {
    try {
      const normalized = sourceText.replace(/\s+/g, " ").trim()
      const sentences = normalized
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)

      const segments = sentences.length > 0 ? sentences : [normalized]
      const selected = segments.slice(0, 5)

      if (selected.length === 0) {
        return [
          {
            front: "Summarize the main idea of the text.",
            back: this.truncateText(normalized, MAX_BACK_LENGTH),
            source: "ai-full",
          },
        ]
      }

      return selected.map((segment, index) => {
        const truncatedSegment = this.truncateText(segment, MAX_BACK_LENGTH)
        const snippet = this.truncateText(segment, MAX_FRONT_LENGTH)

        return {
          front: `What is the key idea in fragment ${index + 1}? ${snippet}`,
          back: truncatedSegment,
          source: "ai-full",
        }
      })
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

