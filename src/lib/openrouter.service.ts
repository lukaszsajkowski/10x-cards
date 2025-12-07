import type { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import {
  OpenRouterAuthError,
  OpenRouterConfigError,
  OpenRouterError,
  OpenRouterNetworkError,
  OpenRouterQuotaError,
  OpenRouterRateLimitError,
  OpenRouterRequestError,
  OpenRouterResponseError,
  OpenRouterServerError,
} from "./openrouter.errors"
import type {
  ChatCompletionParams,
  ChatMessage,
  OpenRouterConfig,
  OpenRouterRawResponse,
  OpenRouterRequestPayload,
  OpenRouterResponseFormat,
  ResponseSchema,
} from "./openrouter.types"

/**
 * Service for communicating with OpenRouter API
 * Handles chat completions with structured JSON responses
 */
export class OpenRouterService {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultModel: string
  private readonly defaultTemperature: number
  private readonly defaultMaxTokens: number
  private readonly timeout: number
  private readonly maxRetries: number

  constructor(config: OpenRouterConfig) {
    if (!config.apiKey) {
      throw new OpenRouterConfigError("API key is required")
    }

    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1"
    this.defaultModel = config.defaultModel ?? "openai/gpt-4o-mini"
    this.defaultTemperature = config.defaultTemperature ?? 0.7
    this.defaultMaxTokens = config.defaultMaxTokens ?? 4096
    this.timeout = config.timeout ?? 60000
    this.maxRetries = config.maxRetries ?? 3
  }

  /**
   * Execute a chat completion request with structured JSON response
   * @param params - Chat completion parameters including messages and response schema
   * @returns Parsed and validated response according to the provided schema
   */
  async chatCompletion<T>(params: ChatCompletionParams<T>): Promise<T> {
    const payload = this.buildRequestPayload(params)
    const rawResponse = await this.executeRequest(payload)
    return this.parseResponse(rawResponse, params.responseSchema.schema)
  }

  /**
   * Build the request payload for OpenRouter API
   */
  private buildRequestPayload<T>(
    params: ChatCompletionParams<T>,
  ): OpenRouterRequestPayload {
    const messages: ChatMessage[] = [
      { role: "system", content: params.systemMessage },
      { role: "user", content: params.userMessage },
    ]

    return {
      model: params.model ?? this.defaultModel,
      messages,
      response_format: this.buildResponseFormat(params.responseSchema),
      temperature: params.temperature ?? this.defaultTemperature,
      max_tokens: params.maxTokens ?? this.defaultMaxTokens,
    }
  }

  /**
   * Build the response_format object with JSON Schema
   */
  private buildResponseFormat<T>(
    responseSchema: ResponseSchema<T>,
  ): OpenRouterResponseFormat {
    const jsonSchema = zodToJsonSchema(responseSchema.schema, {
      $refStrategy: "none",
      target: "openApi3",
    }) as Record<string, unknown>

    // Remove metadata added by zod-to-json-schema
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema, definitions, ...schema } = jsonSchema

    // Ensure additionalProperties is set to false for strict mode
    const schemaWithStrict = {
      ...schema,
      additionalProperties: false,
    }

    return {
      type: "json_schema",
      json_schema: {
        name: responseSchema.name,
        strict: true,
        schema: schemaWithStrict,
      },
    }
  }

  /**
   * Execute HTTP request with retry logic and timeout
   */
  private async executeRequest(
    payload: OpenRouterRequestPayload,
  ): Promise<OpenRouterRawResponse> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "X-Title": "10x-cards",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const error = await this.handleHttpError(response)

          if (!this.isRetryable(error) || attempt === this.maxRetries) {
            throw error
          }

          lastError = error
          await this.delay(this.calculateBackoff(attempt))
          continue
        }

        return (await response.json()) as OpenRouterRawResponse
      } catch (error) {
        if (error instanceof OpenRouterError) {
          lastError = error

          if (!this.isRetryable(error) || attempt === this.maxRetries) {
            throw error
          }
        } else if (error instanceof Error) {
          if (error.name === "AbortError") {
            lastError = new OpenRouterNetworkError("Request timed out", "TIMEOUT")
          } else {
            lastError = new OpenRouterNetworkError(error.message, "NETWORK_ERROR")
          }

          if (attempt === this.maxRetries) {
            throw lastError
          }
        }

        await this.delay(this.calculateBackoff(attempt))
      }
    }

    throw lastError ?? new OpenRouterError("Max retries exceeded", "UNKNOWN_ERROR")
  }

  /**
   * Parse and validate API response
   */
  private parseResponse<T>(
    rawResponse: OpenRouterRawResponse,
    schema: z.ZodType<T>,
  ): T {
    const content = rawResponse.choices?.[0]?.message?.content

    if (!content) {
      throw new OpenRouterResponseError(
        "Empty response content from API",
        "EMPTY_RESPONSE",
      )
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(content)
    } catch {
      throw new OpenRouterResponseError(
        "Failed to parse JSON response",
        "INVALID_JSON",
      )
    }

    const validated = schema.safeParse(parsed)

    if (!validated.success) {
      throw new OpenRouterResponseError(
        `Response validation failed: ${validated.error.message}`,
        "VALIDATION_FAILED",
      )
    }

    return validated.data
  }

  /**
   * Map HTTP status codes to appropriate error classes
   */
  private async handleHttpError(response: Response): Promise<OpenRouterError> {
    let errorBody: { error?: { message?: string } } = {}

    try {
      errorBody = await response.json()
    } catch {
      // Ignore parse error
    }

    const errorMessage = errorBody.error?.message ?? "Unknown error"

    switch (response.status) {
      case 400:
        return new OpenRouterRequestError(errorMessage, "BAD_REQUEST")
      case 401:
        return new OpenRouterAuthError("Invalid API key", "UNAUTHORIZED")
      case 402:
        return new OpenRouterQuotaError("Insufficient credits", "QUOTA_EXCEEDED")
      case 403:
        return new OpenRouterAuthError("Access forbidden", "FORBIDDEN")
      case 404:
        return new OpenRouterRequestError("Model not found", "MODEL_NOT_FOUND")
      case 429: {
        const retryAfter = parseInt(
          response.headers.get("retry-after") ?? "60",
          10,
        )
        return new OpenRouterRateLimitError(
          "Rate limit exceeded",
          "RATE_LIMITED",
          retryAfter,
        )
      }
      case 500:
      case 502:
      case 503:
        return new OpenRouterServerError(
          `Server error: ${response.status}`,
          "SERVER_ERROR",
        )
      default:
        return new OpenRouterError(
          `HTTP error: ${response.status} - ${errorMessage}`,
          "UNKNOWN_ERROR",
        )
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof OpenRouterRateLimitError) return true
    if (error instanceof OpenRouterServerError) return true
    if (error instanceof OpenRouterNetworkError) return true
    return false
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000
    const maxDelay = 30000
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    // Add jitter (±20%)
    return delay * (0.8 + Math.random() * 0.4)
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Export singleton instance
const apiKey = import.meta.env.OPENROUTER_API_KEY

if (!apiKey) {
  console.warn(
    "OPENROUTER_API_KEY is not set. OpenRouter service will not be available.",
  )
}

export const openRouterService = apiKey
  ? new OpenRouterService({ apiKey })
  : null
