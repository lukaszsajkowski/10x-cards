import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  createFlashcardsCommandSchema,
  flashcardDraftSchema,
  flashcardListQuerySchema,
  updateFlashcardCommandSchema,
} from "./flashcard.schema"

describe("flashcardDraftSchema", () => {
  const base = {
    front: "Front",
    back: "Back",
  }

  it("accepts AI sources with a generation id", () => {
    const result = flashcardDraftSchema.safeParse({
      ...base,
      source: "ai-full",
      generation_id: "550e8400-e29b-41d4-a716-446655440000",
    })

    expect(result.success).toBe(true)
  })

  it("rejects AI sources without generation id", () => {
    const result = flashcardDraftSchema.safeParse({
      ...base,
      source: "ai-edited",
      generation_id: null,
    })

    expect(result.success).toBe(false)
    expect(result.success || result.error.format().generation_id?._errors).toContain(
      "generation_id is required for AI sources",
    )
  })

  it("rejects manual sources with generation id present", () => {
    const result = flashcardDraftSchema.safeParse({
      ...base,
      source: "manual",
      generation_id: "550e8400-e29b-41d4-a716-446655440000",
    })

    expect(result.success).toBe(false)
    expect(result.success || result.error.format().generation_id?._errors).toContain(
      "generation_id must be null when source is manual",
    )
  })
})

describe("createFlashcardsCommandSchema", () => {
  it("requires at least one flashcard and enforces max batch size", () => {
    const emptyResult = createFlashcardsCommandSchema.safeParse({ flashcards: [] })
    expect(emptyResult.success).toBe(false)

    const tooMany = Array.from({ length: 101 }, (_, idx) => ({
      front: `Front ${idx}`,
      back: `Back ${idx}`,
      source: "manual" as const,
      generation_id: null,
    }))

    const tooManyResult = createFlashcardsCommandSchema.safeParse({ flashcards: tooMany })
    expect(tooManyResult.success).toBe(false)
  })
})

describe("flashcardListQuerySchema", () => {
  it("coerces and defaults pagination params", () => {
    const result = flashcardListQuerySchema.parse({})

    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
    expect(result.sort).toBe("created_at")
    expect(result.order).toBe("desc")
  })
})

describe("updateFlashcardCommandSchema", () => {
  it("rejects payloads with no fields", () => {
    const result = updateFlashcardCommandSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.success || result.error.issues[0].message).toBe("No fields to update")
  })

  it("requires generation id when switching to AI source", () => {
    const result = updateFlashcardCommandSchema.safeParse({
      source: "ai-full",
    })

    expect(result.success).toBe(false)
    expect(result.success || result.error.format().generation_id?._errors).toContain(
      "generation_id is required when updating source to AI",
    )
  })

  it("rejects manual source with non-null generation id", () => {
    const result = updateFlashcardCommandSchema.safeParse({
      source: "manual",
      generation_id: "550e8400-e29b-41d4-a716-446655440000",
    })

    expect(result.success).toBe(false)
    expect(result.success || result.error.format().generation_id?._errors).toContain(
      "generation_id must be null when source is manual",
    )
  })

  it("accepts AI source with valid generation id", () => {
    const result = updateFlashcardCommandSchema.safeParse({
      source: "ai-edited",
      generation_id: "550e8400-e29b-41d4-a716-446655440000",
    })

    expect(result.success).toBe(true)
  })
})

