import type { APIRoute } from "astro"

import { DEFAULT_USER_ID } from "../../../db/supabase.client"
import { generationIdParamSchema } from "../../../lib/generation.schema"
import { generationService } from "../../../lib/generation.service"

export const prerender = false

const JSON_HEADERS = {
  "content-type": "application/json",
} as const

export const GET: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase

  if (!supabase) {
    return new Response(
      JSON.stringify({ message: "Supabase client not available" }),
      { status: 500, headers: JSON_HEADERS },
    )
  }

  const parsedParams = generationIdParamSchema.safeParse({ id: params?.id })

  if (!parsedParams.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedParams.error.flatten().fieldErrors,
      }),
      { status: 400, headers: JSON_HEADERS },
    )
  }

  try {
    const result = await generationService.getGenerationDetail({
      supabase,
      userId: DEFAULT_USER_ID,
      generationId: parsedParams.data.id,
    })

    if (!result) {
      return new Response(
        JSON.stringify({ message: "Generation not found" }),
        { status: 404, headers: JSON_HEADERS },
      )
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    console.error("Failed to fetch generation", error)

    return new Response(
      JSON.stringify({ message: "Failed to fetch generation" }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
}


