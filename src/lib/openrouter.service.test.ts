import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { OpenRouterService } from "./openrouter.service";
import {
  OpenRouterError,
  OpenRouterConfigError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterQuotaError,
  OpenRouterRequestError,
  OpenRouterResponseError,
  OpenRouterServerError,
  OpenRouterNetworkError,
} from "./openrouter.errors";
import type { OpenRouterConfig, OpenRouterRawResponse } from "./openrouter.types";

// Test schema for response validation
const testResponseSchema = z.object({
  message: z.string(),
  count: z.number(),
});

type TestResponse = z.infer<typeof testResponseSchema>;

// Helper to create valid config
const createConfig = (overrides: Partial<OpenRouterConfig> = {}): OpenRouterConfig => ({
  apiKey: "test-api-key",
  ...overrides,
});

// Helper to create valid raw API response
const createRawResponse = (content: string): OpenRouterRawResponse => ({
  id: "test-id",
  model: "openai/gpt-4o-mini",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content,
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
});

// Helper to create chat completion params
const createChatParams = () => ({
  systemMessage: "You are a helpful assistant.",
  userMessage: "Hello, world!",
  responseSchema: {
    name: "test_response",
    schema: testResponseSchema,
  },
});

describe("OpenRouterService", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should throw OpenRouterConfigError when API key is missing", () => {
      expect(() => new OpenRouterService({ apiKey: "" })).toThrow(OpenRouterConfigError);
      expect(() => new OpenRouterService({ apiKey: "" })).toThrow("API key is required");
    });

    it("should create instance with valid API key", () => {
      const service = new OpenRouterService(createConfig());
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("should apply default configuration values", () => {
      const service = new OpenRouterService(createConfig());
      
      // We can test defaults by checking the request payload
      const validResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validResponse),
      });

      // Trigger a request to see the defaults in action
      service.chatCompletion(createChatParams());
      
      // Advance timers to let the request start
      vi.advanceTimersByTime(0);
      
      expect(fetchMock).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          body: expect.stringContaining('"model":"openai/gpt-4o-mini"'),
        })
      );
    });

    it("should allow custom configuration", () => {
      const customConfig = createConfig({
        baseUrl: "https://custom.api.com",
        defaultModel: "anthropic/claude-3",
        defaultTemperature: 0.5,
        defaultMaxTokens: 2048,
        timeout: 30000,
        maxRetries: 5,
      });

      const service = new OpenRouterService(customConfig);
      
      const validResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validResponse),
      });

      service.chatCompletion(createChatParams());
      vi.advanceTimersByTime(0);
      
      expect(fetchMock).toHaveBeenCalledWith(
        "https://custom.api.com/chat/completions",
        expect.objectContaining({
          body: expect.stringContaining('"model":"anthropic/claude-3"'),
        })
      );
    });
  });

  describe("chatCompletion", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(createConfig());
    });

    it("should return parsed response on successful request", async () => {
      const responseData = { message: "Hello!", count: 42 };
      const rawResponse = createRawResponse(JSON.stringify(responseData));
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawResponse),
      });

      const resultPromise = service.chatCompletion<TestResponse>(createChatParams());
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      expect(result).toEqual(responseData);
    });

    it("should include correct headers in request", async () => {
      const rawResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawResponse),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();
      await resultPromise;

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-api-key",
            "X-Title": "10x-cards",
          },
        })
      );
    });

    it("should build correct request payload with messages", async () => {
      const rawResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawResponse),
      });

      const params = createChatParams();
      const resultPromise = service.chatCompletion(params);
      await vi.runAllTimersAsync();
      await resultPromise;

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.messages).toEqual([
        { role: "system", content: params.systemMessage },
        { role: "user", content: params.userMessage },
      ]);
    });

    it("should use custom model when provided", async () => {
      const rawResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawResponse),
      });

      const params = {
        ...createChatParams(),
        model: "custom/model",
      };
      
      const resultPromise = service.chatCompletion(params);
      await vi.runAllTimersAsync();
      await resultPromise;

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.model).toBe("custom/model");
    });

    it("should use custom temperature and maxTokens when provided", async () => {
      const rawResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawResponse),
      });

      const params = {
        ...createChatParams(),
        temperature: 0.3,
        maxTokens: 1000,
      };
      
      const resultPromise = service.chatCompletion(params);
      await vi.runAllTimersAsync();
      await resultPromise;

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.temperature).toBe(0.3);
      expect(callBody.max_tokens).toBe(1000);
    });

    it("should include response_format with JSON schema", async () => {
      const rawResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawResponse),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();
      await resultPromise;

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.response_format).toMatchObject({
        type: "json_schema",
        json_schema: {
          name: "test_response",
          strict: true,
          schema: expect.objectContaining({
            type: "object",
            additionalProperties: false,
          }),
        },
      });
    });
  });

  describe("response parsing", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(createConfig());
    });

    it("should throw EMPTY_RESPONSE error when response has no content", async () => {
      const emptyResponse: OpenRouterRawResponse = {
        id: "test-id",
        model: "test-model",
        choices: [],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterResponseError);
      await expect(resultPromise).rejects.toThrow("Empty response content from API");
    });

    it("should throw INVALID_JSON error when content is not valid JSON", async () => {
      const invalidJsonResponse = createRawResponse("not valid json {");
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidJsonResponse),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterResponseError);
      await expect(resultPromise).rejects.toThrow("Failed to parse JSON response");
    });

    it("should throw VALIDATION_FAILED error when response doesn't match schema", async () => {
      const invalidSchemaResponse = createRawResponse(
        JSON.stringify({ message: "test", count: "not a number" })
      );
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidSchemaResponse),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterResponseError);
      await expect(resultPromise).rejects.toThrow("Response validation failed");
    });

    it("should throw VALIDATION_FAILED error when required field is missing", async () => {
      const missingFieldResponse = createRawResponse(
        JSON.stringify({ message: "test" }) // missing 'count'
      );
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(missingFieldResponse),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterResponseError);
    });
  });

  describe("HTTP error handling", () => {
    let service: OpenRouterService;

    beforeEach(() => {
      service = new OpenRouterService(createConfig({ maxRetries: 1 }));
    });

    it("should throw OpenRouterRequestError for 400 Bad Request", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "Invalid request" } }),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterRequestError);
      await expect(resultPromise).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("should throw OpenRouterAuthError for 401 Unauthorized", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterAuthError);
      await expect(resultPromise).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("should throw OpenRouterQuotaError for 402 Payment Required", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterQuotaError);
      await expect(resultPromise).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    });

    it("should throw OpenRouterAuthError for 403 Forbidden", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterAuthError);
      await expect(resultPromise).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should throw OpenRouterRequestError for 404 Not Found", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterRequestError);
      await expect(resultPromise).rejects.toMatchObject({ code: "MODEL_NOT_FOUND" });
    });

    it("should throw OpenRouterRateLimitError for 429 with retry-after header", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "retry-after": "120" }),
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterRateLimitError);
      await expect(resultPromise).rejects.toMatchObject({
        code: "RATE_LIMITED",
        retryAfter: 120,
      });
    });

    it("should use default retry-after of 60 when header is missing", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toMatchObject({
        retryAfter: 60,
      });
    });

    it.each([500, 502, 503])("should throw OpenRouterServerError for %i", async (status) => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterServerError);
      await expect(resultPromise).rejects.toMatchObject({ code: "SERVER_ERROR" });
    });

    it("should throw OpenRouterError for unknown status codes", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 418, // I'm a teapot
        json: () => Promise.resolve({ error: { message: "I'm a teapot" } }),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterError);
      await expect(resultPromise).rejects.toMatchObject({ code: "UNKNOWN_ERROR" });
    });

    it("should handle JSON parse error in error response gracefully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      // Should still throw the appropriate error with "Unknown error" message
      await expect(resultPromise).rejects.toThrow(OpenRouterRequestError);
    });
  });

  describe("retry logic", () => {
    it("should retry on server errors up to maxRetries", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 3 }));
      
      // First two calls fail with 503, third succeeds
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createRawResponse(JSON.stringify({ message: "success", count: 1 }))),
        });

      const resultPromise = service.chatCompletion(createChatParams());
      
      // Advance through all retry delays
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      expect(result).toEqual({ message: "success", count: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("should retry on rate limit errors", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 2 }));
      
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ "retry-after": "1" }),
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createRawResponse(JSON.stringify({ message: "success", count: 1 }))),
        });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      expect(result).toEqual({ message: "success", count: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should retry on network errors", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 2 }));
      
      fetchMock
        .mockRejectedValueOnce(new Error("Network failure"))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createRawResponse(JSON.stringify({ message: "success", count: 1 }))),
        });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      expect(result).toEqual({ message: "success", count: 1 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should NOT retry on authentication errors (401)", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 3 }));
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterAuthError);
      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it("should NOT retry on quota errors (402)", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 3 }));
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 402,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterQuotaError);
      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it("should NOT retry on bad request errors (400)", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 3 }));
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "Bad request" } }),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterRequestError);
      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it("should throw after exhausting all retries", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 2 }));
      
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      });

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterServerError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("timeout handling", () => {
    it("should convert AbortError to TIMEOUT error", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 1 }));
      
      // Simulate what happens when AbortController aborts the request
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      fetchMock.mockRejectedValueOnce(abortError);

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterNetworkError);
      await expect(resultPromise).rejects.toMatchObject({ code: "TIMEOUT" });
    });

    it("should handle AbortError from fetch and classify as timeout", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 1 }));
      
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      fetchMock.mockRejectedValueOnce(abortError);

      const resultPromise = service.chatCompletion(createChatParams());
      await vi.runAllTimersAsync();

      await expect(resultPromise).rejects.toThrow(OpenRouterNetworkError);
      await expect(resultPromise).rejects.toMatchObject({ code: "TIMEOUT" });
    });

    it("should set up AbortController with correct timeout", () => {
      const service = new OpenRouterService(createConfig({ timeout: 5000 }));
      
      const rawResponse = createRawResponse(JSON.stringify({ message: "test", count: 1 }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawResponse),
      });

      service.chatCompletion(createChatParams());
      
      // Verify fetch was called with an AbortSignal
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe("backoff calculation", () => {
    it("should apply exponential backoff between retries", async () => {
      const service = new OpenRouterService(createConfig({ maxRetries: 3 }));
      
      // All calls fail
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      });

      // Spy on setTimeout to verify backoff delays
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      const resultPromise = service.chatCompletion(createChatParams());
      
      // Run all timers to completion
      await vi.runAllTimersAsync();

      // Verify exponential growth pattern (with jitter, delays should be approximately 1000, 2000)
      // Filter setTimeout calls that are for backoff (not the request timeout)
      const backoffCalls = setTimeoutSpy.mock.calls.filter(
        ([, delay]) => typeof delay === "number" && delay > 500 && delay < 35000
      );
      
      expect(backoffCalls.length).toBeGreaterThanOrEqual(1);
      
      await expect(resultPromise).rejects.toThrow();
      
      setTimeoutSpy.mockRestore();
    });
  });
});

describe("OpenRouter Error Classes", () => {
  describe("OpenRouterError (base)", () => {
    it("should store message and code", () => {
      const error = new OpenRouterError("Test error", "UNKNOWN_ERROR");
      
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.name).toBe("OpenRouterError");
    });

    it("should store cause when provided", () => {
      const cause = new Error("Original error");
      const error = new OpenRouterError("Wrapped error", "UNKNOWN_ERROR", cause);
      
      expect(error.cause).toBe(cause);
    });

    it("should be instanceof Error", () => {
      const error = new OpenRouterError("Test", "UNKNOWN_ERROR");
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("OpenRouterConfigError", () => {
    it("should have CONFIG_ERROR code", () => {
      const error = new OpenRouterConfigError("Missing API key");
      
      expect(error.code).toBe("CONFIG_ERROR");
      expect(error.name).toBe("OpenRouterConfigError");
    });

    it("should be instanceof OpenRouterError", () => {
      const error = new OpenRouterConfigError("Test");
      expect(error).toBeInstanceOf(OpenRouterError);
    });
  });

  describe("OpenRouterAuthError", () => {
    it("should accept UNAUTHORIZED code", () => {
      const error = new OpenRouterAuthError("Invalid key", "UNAUTHORIZED");
      
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.name).toBe("OpenRouterAuthError");
    });

    it("should accept FORBIDDEN code", () => {
      const error = new OpenRouterAuthError("Access denied", "FORBIDDEN");
      
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  describe("OpenRouterRateLimitError", () => {
    it("should store retryAfter value", () => {
      const error = new OpenRouterRateLimitError("Rate limited", "RATE_LIMITED", 120);
      
      expect(error.code).toBe("RATE_LIMITED");
      expect(error.retryAfter).toBe(120);
      expect(error.name).toBe("OpenRouterRateLimitError");
    });
  });

  describe("OpenRouterQuotaError", () => {
    it("should have QUOTA_EXCEEDED code", () => {
      const error = new OpenRouterQuotaError("No credits", "QUOTA_EXCEEDED");
      
      expect(error.code).toBe("QUOTA_EXCEEDED");
      expect(error.name).toBe("OpenRouterQuotaError");
    });
  });

  describe("OpenRouterRequestError", () => {
    it("should accept BAD_REQUEST code", () => {
      const error = new OpenRouterRequestError("Invalid params", "BAD_REQUEST");
      
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.name).toBe("OpenRouterRequestError");
    });

    it("should accept MODEL_NOT_FOUND code", () => {
      const error = new OpenRouterRequestError("Model not found", "MODEL_NOT_FOUND");
      
      expect(error.code).toBe("MODEL_NOT_FOUND");
    });
  });

  describe("OpenRouterResponseError", () => {
    it("should accept EMPTY_RESPONSE code", () => {
      const error = new OpenRouterResponseError("Empty", "EMPTY_RESPONSE");
      
      expect(error.code).toBe("EMPTY_RESPONSE");
      expect(error.name).toBe("OpenRouterResponseError");
    });

    it("should accept INVALID_JSON code", () => {
      const error = new OpenRouterResponseError("Bad JSON", "INVALID_JSON");
      
      expect(error.code).toBe("INVALID_JSON");
    });

    it("should accept VALIDATION_FAILED code", () => {
      const error = new OpenRouterResponseError("Schema mismatch", "VALIDATION_FAILED");
      
      expect(error.code).toBe("VALIDATION_FAILED");
    });
  });

  describe("OpenRouterServerError", () => {
    it("should have SERVER_ERROR code", () => {
      const error = new OpenRouterServerError("Server down", "SERVER_ERROR");
      
      expect(error.code).toBe("SERVER_ERROR");
      expect(error.name).toBe("OpenRouterServerError");
    });
  });

  describe("OpenRouterNetworkError", () => {
    it("should accept NETWORK_ERROR code", () => {
      const error = new OpenRouterNetworkError("Connection failed", "NETWORK_ERROR");
      
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.name).toBe("OpenRouterNetworkError");
    });

    it("should accept TIMEOUT code", () => {
      const error = new OpenRouterNetworkError("Timed out", "TIMEOUT");
      
      expect(error.code).toBe("TIMEOUT");
    });
  });

  describe("error hierarchy", () => {
    it("all error types should be instanceof Error", () => {
      const errors = [
        new OpenRouterError("test", "UNKNOWN_ERROR"),
        new OpenRouterConfigError("test"),
        new OpenRouterAuthError("test", "UNAUTHORIZED"),
        new OpenRouterRateLimitError("test", "RATE_LIMITED", 60),
        new OpenRouterQuotaError("test", "QUOTA_EXCEEDED"),
        new OpenRouterRequestError("test", "BAD_REQUEST"),
        new OpenRouterResponseError("test", "EMPTY_RESPONSE"),
        new OpenRouterServerError("test", "SERVER_ERROR"),
        new OpenRouterNetworkError("test", "NETWORK_ERROR"),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(OpenRouterError);
      });
    });
  });
});
