import type { APIRoute } from "astro";

import { generationIdParamSchema } from "../../../lib/generation.schema";
import { generationService } from "../../../lib/generation.service";

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

  const parsedParams = generationIdParamSchema.safeParse({ id: params?.id });

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
    const result = await generationService.getGenerationDetail({
      supabase,
      userId: user.id,
      generationId: parsedParams.data.id,
    });

    if (!result) {
      return new Response(JSON.stringify({ message: "Generation not found" }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("Failed to fetch generation", error);

    return new Response(JSON.stringify({ message: "Failed to fetch generation" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
