import type { APIRoute } from "astro";

import { flashcardIdParamSchema, updateFlashcardCommandSchema } from "../../../lib/flashcard.schema";
import { FlashcardServiceError, flashcardService } from "../../../lib/flashcard.service";

export const prerender = false;

const JSON_HEADERS = {
  "content-type": "application/json",
} as const;

export const GET: APIRoute = async ({ params, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const parsedParams = flashcardIdParamSchema.safeParse({ id: params?.id });

  if (!parsedParams.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedParams.error.flatten().fieldErrors,
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  try {
    const result = await flashcardService.getFlashcardDetail({
      supabase,
      userId: user.id,
      flashcardId: parsedParams.data.id,
    });

    if (!result) {
      return new Response(JSON.stringify({ message: "Flashcard not found" }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Failed to fetch flashcard", error);

    return new Response(JSON.stringify({ message: "Failed to fetch flashcard" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const parsedParams = flashcardIdParamSchema.safeParse({ id: params?.id });

  if (!parsedParams.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedParams.error.flatten().fieldErrors,
      }),
      { status: 400, headers: JSON_HEADERS }
    );
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

  const parsedBody = updateFlashcardCommandSchema.safeParse(body);
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedBody.error.flatten().fieldErrors,
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  try {
    const result = await flashcardService.updateFlashcard({
      supabase,
      userId: user.id,
      flashcardId: parsedParams.data.id,
      command: parsedBody.data,
    });

    if (!result) {
      return new Response(JSON.stringify({ message: "Flashcard not found" }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof FlashcardServiceError) {
      if (error.code === "INVALID_UPDATE_PAYLOAD" || error.code === "INVALID_GENERATION_LINK") {
        return new Response(JSON.stringify({ message: error.message, code: error.code }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }
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

    console.error("Unhandled error while updating flashcard", error);
    return new Response(JSON.stringify({ message: "Failed to update flashcard" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { supabase, user } = locals;

  if (!user) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const parsedParams = flashcardIdParamSchema.safeParse({ id: params?.id });

  if (!parsedParams.success) {
    return new Response(
      JSON.stringify({
        message: "Validation error",
        errors: parsedParams.error.flatten().fieldErrors,
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  try {
    const deleted = await flashcardService.deleteFlashcard({
      supabase,
      userId: user.id,
      flashcardId: parsedParams.data.id,
    });

    if (!deleted) {
      return new Response(JSON.stringify({ message: "Flashcard not found" }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ message: "Flashcard deleted" }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    if (error instanceof FlashcardServiceError) {
      return new Response(JSON.stringify({ message: error.message, code: error.code }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }

    console.error("Failed to delete flashcard", error);
    return new Response(JSON.stringify({ message: "Failed to delete flashcard" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
