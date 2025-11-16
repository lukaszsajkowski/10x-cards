import { z } from "zod"

const FRONT_MAX_LENGTH = 200
const BACK_MAX_LENGTH = 500
const MAX_BATCH_SIZE = 100

export const flashcardDraftSchema = z
  .object({
    front: z
      .string()
      .min(1, "front is required")
      .max(FRONT_MAX_LENGTH, `front must be at most ${FRONT_MAX_LENGTH} characters long`),
    back: z
      .string()
      .min(1, "back is required")
      .max(BACK_MAX_LENGTH, `back must be at most ${BACK_MAX_LENGTH} characters long`),
    source: z.enum(["ai-full", "ai-edited", "manual"]),
    generation_id: z.string().uuid().nullable(),
  })
  .superRefine((val, ctx) => {
    const isAiSource = val.source === "ai-full" || val.source === "ai-edited"
    if (val.source === "manual" && val.generation_id !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "generation_id must be null when source is manual",
        path: ["generation_id"],
      })
    }
    if (isAiSource && (val.generation_id === null || typeof val.generation_id !== "string")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "generation_id is required for AI sources",
        path: ["generation_id"],
      })
    }
  })

export const createFlashcardsCommandSchema = z.object({
  flashcards: z.array(flashcardDraftSchema).min(1).max(MAX_BATCH_SIZE),
})

export type FlashcardDraftInput = z.infer<typeof flashcardDraftSchema>
export type CreateFlashcardsCommandInput = z.infer<
  typeof createFlashcardsCommandSchema
>

export const flashcardListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(["created_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  source: z.enum(["ai-full", "ai-edited", "manual"]).optional(),
  generation_id: z.string().uuid().optional(),
})

export type FlashcardListQueryInput = z.infer<typeof flashcardListQuerySchema>

export const flashcardIdParamSchema = z.object({
  id: z.string().uuid(),
})
export type FlashcardIdParamInput = z.infer<typeof flashcardIdParamSchema>


export const updateFlashcardCommandSchema = z
  .object({
    front: z
      .string()
      .min(1, "front is required")
      .max(FRONT_MAX_LENGTH, `front must be at most ${FRONT_MAX_LENGTH} characters long`)
      .optional(),
    back: z
      .string()
      .min(1, "back is required")
      .max(BACK_MAX_LENGTH, `back must be at most ${BACK_MAX_LENGTH} characters long`)
      .optional(),
    source: z.enum(["ai-full", "ai-edited", "manual"]).optional(),
    generation_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (val) =>
      val.front !== undefined ||
      val.back !== undefined ||
      val.source !== undefined ||
      val.generation_id !== undefined,
    { message: "No fields to update" },
  )
  .superRefine((val, ctx) => {
    const isAiSource = val.source === "ai-full" || val.source === "ai-edited"
    const isManualSource = val.source === "manual"

    // When both source and generation_id are provided, enforce strict consistency
    if (val.source !== undefined && val.generation_id !== undefined) {
      if (isManualSource && val.generation_id !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "generation_id must be null when source is manual",
          path: ["generation_id"],
        })
      }
      if (isAiSource && (val.generation_id === null || typeof val.generation_id !== "string")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "generation_id is required for AI sources",
          path: ["generation_id"],
        })
      }
    }

    // When only source is provided: if AI, require generation_id in the request
    if (val.source !== undefined && val.generation_id === undefined && isAiSource) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "generation_id is required when updating source to AI",
        path: ["generation_id"],
      })
    }
  })

export type UpdateFlashcardCommandInput = z.infer<
  typeof updateFlashcardCommandSchema
>


