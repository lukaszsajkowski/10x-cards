import { http, HttpResponse } from "msw";

// Define API base URL - adjust if your API uses a different base
const API_BASE = "/api";

/**
 * MSW request handlers for mocking API responses in tests.
 *
 * Add handlers for each API endpoint you want to mock.
 * These handlers will be used by default in all tests.
 *
 * For test-specific overrides, use:
 *   server.use(http.get('/api/...', () => HttpResponse.json({...})))
 */
export const handlers = [
  // Example: GET /api/flashcards
  http.get(`${API_BASE}/flashcards`, () => {
    return HttpResponse.json({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
    });
  }),

  // Example: POST /api/flashcards
  http.post(`${API_BASE}/flashcards`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: "mock-id-123",
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Example: GET /api/generations
  http.get(`${API_BASE}/generations`, () => {
    return HttpResponse.json({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
    });
  }),

  // Example: POST /api/generations
  http.post(`${API_BASE}/generations`, async () => {
    return HttpResponse.json(
      {
        id: "mock-generation-id",
        flashcards_proposals: [],
        generated_count: 0,
        generation_duration: 1000,
        model: "test-model",
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Add more handlers as needed for your API endpoints
];
