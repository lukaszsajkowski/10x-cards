import type { APIRoute } from "astro"

import { DEFAULT_USER_ID } from "../../db/supabase.client"
import {
  createGenerationCommandSchema,
  generationListQuerySchema,
} from "../../lib/generation.schema"
import {
  GenerationServiceError,
  generationService,
} from "../../lib/generation.service"

export const prerender = false

const JSON_HEADERS = {
  "content-type": "application/json",
} as const

export const GET: APIRoute = async ({ url, locals }) => {
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

  const parsedQuery = generationListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  })

  if (!parsedQuery.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedQuery.error.flatten().fieldErrors,
      }),
      {
        status: 400,
        headers: JSON_HEADERS,
      },
    )
  }

  try {
    const result = await generationService.listGenerations({
      supabase,
      userId: DEFAULT_USER_ID,
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
      order: parsedQuery.data.order,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    console.error("Failed to list generations", error)

    return new Response(
      JSON.stringify({ message: "Failed to list generations" }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    )
  }
}

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

  const parsedBody = createGenerationCommandSchema.safeParse(body)

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
    const result = await generationService.createGeneration({
      supabase,
      userId: DEFAULT_USER_ID,
      sourceText: parsedBody.data.source_text,
    })

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    if (error instanceof GenerationServiceError) {
      return new Response(
        JSON.stringify({
          message: error.message,
          code: error.code,
        }),
        {
          status: 500,
          headers: JSON_HEADERS,
        },
      )
    }

    console.error("Unhandled error while creating generation", error)

    return new Response(
      JSON.stringify({ message: "Failed to create generation" }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    )
  }
}

