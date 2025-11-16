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


