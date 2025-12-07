import type { OpenRouterErrorCode } from "./openrouter.types"

/**
 * Base error class for OpenRouter service
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: OpenRouterErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = "OpenRouterError"
  }
}

/**
 * Configuration error - missing or invalid configuration
 */
export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR")
    this.name = "OpenRouterConfigError"
  }
}

/**
 * Authentication error - invalid API key or forbidden access
 */
export class OpenRouterAuthError extends OpenRouterError {
  constructor(message: string, code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(message, code)
    this.name = "OpenRouterAuthError"
  }
}

/**
 * Rate limit error - too many requests
 */
export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string,
    code: "RATE_LIMITED",
    public readonly retryAfter: number,
  ) {
    super(message, code)
    this.name = "OpenRouterRateLimitError"
  }
}

/**
 * Quota error - insufficient credits
 */
export class OpenRouterQuotaError extends OpenRouterError {
  constructor(message: string, code: "QUOTA_EXCEEDED") {
    super(message, code)
    this.name = "OpenRouterQuotaError"
  }
}

/**
 * Request error - invalid request parameters or model not found
 */
export class OpenRouterRequestError extends OpenRouterError {
  constructor(message: string, code: "BAD_REQUEST" | "MODEL_NOT_FOUND") {
    super(message, code)
    this.name = "OpenRouterRequestError"
  }
}

/**
 * Response error - empty response, invalid JSON, or validation failed
 */
export class OpenRouterResponseError extends OpenRouterError {
  constructor(
    message: string,
    code: "EMPTY_RESPONSE" | "INVALID_JSON" | "VALIDATION_FAILED",
  ) {
    super(message, code)
    this.name = "OpenRouterResponseError"
  }
}

/**
 * Server error - 5xx errors from OpenRouter API
 */
export class OpenRouterServerError extends OpenRouterError {
  constructor(message: string, code: "SERVER_ERROR") {
    super(message, code)
    this.name = "OpenRouterServerError"
  }
}

/**
 * Network error - connection issues or timeouts
 */
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string, code: "NETWORK_ERROR" | "TIMEOUT") {
    super(message, code)
    this.name = "OpenRouterNetworkError"
  }
}
