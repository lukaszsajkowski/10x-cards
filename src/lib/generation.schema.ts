import { z } from "zod"

const SOURCE_TEXT_MIN_LENGTH = 1000
const SOURCE_TEXT_MAX_LENGTH = 10000

export const createGenerationCommandSchema = z.object({
  source_text: z
    .string()
    .min(
      SOURCE_TEXT_MIN_LENGTH,
      `source_text must be at least ${SOURCE_TEXT_MIN_LENGTH} characters long`,
    )
    .max(
      SOURCE_TEXT_MAX_LENGTH,
      `source_text must be at most ${SOURCE_TEXT_MAX_LENGTH} characters long`,
    ),
})

export type CreateGenerationCommandInput = z.infer<
  typeof createGenerationCommandSchema
>

export const generationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  order: z.enum(["asc", "desc"]).default("desc"),
})

export type GenerationListQueryInput = z.infer<typeof generationListQuerySchema>

export const generationIdParamSchema = z.object({
  id: z.string().uuid(),
})

export type GenerationIdParamInput = z.infer<typeof generationIdParamSchema>

