import type { APIRoute } from "astro"

import { DEFAULT_USER_ID } from "../../db/supabase.client"
import {
  createFlashcardsCommandSchema,
} from "../../lib/flashcard.schema"
import {
  FlashcardServiceError,
  flashcardService,
} from "../../lib/flashcard.service"

export const prerender = false

const JSON_HEADERS = {
  "content-type": "application/json",
} as const

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase

  if (!supabase) {
    return new Response(
      JSON.stringify({ message: "Supabase client not available" }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON payload" }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const parsedBody = createFlashcardsCommandSchema.safeParse(body)

  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedBody.error.flatten().fieldErrors,
      }),
      {
        status: 400,
        headers: JSON_HEADERS,
      },
    )
  }

  try {
    const result = await flashcardService.createFlashcards({
      supabase,
      userId: DEFAULT_USER_ID,
      flashcards: parsedBody.data.flashcards,
    })

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    if (error instanceof FlashcardServiceError) {
      if (error.code === "GENERATION_NOT_FOUND") {
        return new Response(
          JSON.stringify({ message: "Generation not found", code: error.code }),
          { status: 404, headers: JSON_HEADERS },
        )
      }

      return new Response(
        JSON.stringify({ message: error.message, code: error.code }),
        { status: 500, headers: JSON_HEADERS },
      )
    }

    console.error("Unhandled error while creating flashcards", error)

    return new Response(
      JSON.stringify({ message: "Failed to create flashcards" }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    )
  }
}


