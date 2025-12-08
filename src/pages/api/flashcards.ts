import type { APIRoute } from "astro";

import { createFlashcardsCommandSchema, flashcardListQuerySchema } from "../../lib/flashcard.schema";
import { FlashcardServiceError, flashcardService } from "../../lib/flashcard.service";

export const prerender = false;

const JSON_HEADERS = {
  "content-type": "application/json",
} as const;

export const GET: APIRoute = async ({ url, locals }) => {
  const { supabase, user } = locals;

  // Middleware gwarantuje że user istnieje dla chronionych tras
  // Ten check jest dodatkowym zabezpieczeniem
  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const parsedQuery = flashcardListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    generation_id: url.searchParams.get("generation_id") ?? undefined,
  });

  if (!parsedQuery.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedQuery.error.flatten().fieldErrors,
      }),
      {
        status: 400,
        headers: JSON_HEADERS,
      }
    );
  }

  try {
    const result = await flashcardService.listFlashcards({
      supabase,
      userId: user.id,
      query: parsedQuery.data,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Failed to fetch flashcards", error);

    return new Response(JSON.stringify({ message: "Failed to fetch flashcards" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON payload" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const parsedBody = createFlashcardsCommandSchema.safeParse(body);

  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedBody.error.flatten().fieldErrors,
      }),
      {
        status: 400,
        headers: JSON_HEADERS,
      }
    );
  }

  try {
    const result = await flashcardService.createFlashcards({
      supabase,
      userId: user.id,
      flashcards: parsedBody.data.flashcards,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof FlashcardServiceError) {
      if (error.code === "GENERATION_NOT_FOUND") {
        return new Response(JSON.stringify({ message: "Generation not found", code: error.code }), {
          status: 404,
          headers: JSON_HEADERS,
        });
      }

      return new Response(JSON.stringify({ message: error.message, code: error.code }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    console.error("Unhandled error while creating flashcards", error);

    return new Response(JSON.stringify({ message: "Failed to create flashcards" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
