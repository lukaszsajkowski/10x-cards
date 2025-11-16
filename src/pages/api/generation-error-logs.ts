import type { APIRoute } from "astro"

import { DEFAULT_USER_ID } from "../../db/supabase.client"
import { errorLogListQuerySchema } from "../../lib/generation-error-log.schema"
import { generationService } from "../../lib/generation.service"

export const prerender = false

const JSON_HEADERS = {
  "content-type": "application/json",
} as const

function getAdminUserIds(): Set<string> {
  const raw = (import.meta.env.ADMIN_USER_IDS as string | undefined) ?? ""
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  )
}

export const GET: APIRoute = async ({ url, locals }) => {
  const supabase = locals.supabase

  if (!supabase) {
    return new Response(JSON.stringify({ message: "Supabase client not available" }), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }

  const parsedQuery = errorLogListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
    user_id: url.searchParams.get("user_id") ?? undefined,
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

  const currentUserId = DEFAULT_USER_ID
  const adminIds = getAdminUserIds()
  const isAdmin = adminIds.has(currentUserId)

  if (parsedQuery.data.user_id && !isAdmin) {
    return new Response(
      JSON.stringify({ message: "Forbidden to access another user's logs" }),
      { status: 403, headers: JSON_HEADERS },
    )
  }

  const effectiveUserId = parsedQuery.data.user_id ?? currentUserId

  try {
    const result = await generationService.listGenerationErrorLogs({
      supabase,
      userId: effectiveUserId,
      page: parsedQuery.data.page,
      limit: parsedQuery.data.limit,
      order: parsedQuery.data.order,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    console.error("Failed to list generation error logs", error)
    return new Response(
      JSON.stringify({ message: "Failed to list generation error logs" }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
}


