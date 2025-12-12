import { describe, expect, it } from "vitest"

import {
  createGenerationCommandSchema,
  generationIdParamSchema,
  generationListQuerySchema,
} from "./generation.schema"

describe("createGenerationCommandSchema", () => {
  it("enforces minimum and maximum source text length", () => {
    const shortText = "too short"
    const shortResult = createGenerationCommandSchema.safeParse({ source_text: shortText })
    expect(shortResult.success).toBe(false)

    const validText = "a".repeat(1000)
    const validResult = createGenerationCommandSchema.safeParse({ source_text: validText })
    expect(validResult.success).toBe(true)

    const longText = "a".repeat(10001)
    const longResult = createGenerationCommandSchema.safeParse({ source_text: longText })
    expect(longResult.success).toBe(false)
  })
})

describe("generationListQuerySchema", () => {
  it("applies defaults and coerces numeric params", () => {
    const result = generationListQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
    expect(result.order).toBe("desc")
  })

  it("rejects values beyond allowed limits", () => {
    const result = generationListQuerySchema.safeParse({ limit: 51 })
    expect(result.success).toBe(false)
  })
})

describe("generationIdParamSchema", () => {
  it("requires a valid uuid", () => {
    const invalid = generationIdParamSchema.safeParse({ id: "not-a-uuid" })
    expect(invalid.success).toBe(false)

    const valid = generationIdParamSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(valid.success).toBe(true)
  })
})

