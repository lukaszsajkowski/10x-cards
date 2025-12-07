import type { z } from "zod"

/**
 * Configuration for OpenRouter service
 */
export interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  timeout?: number
  maxRetries?: number
}

/**
 * Parameters for chat completion requests
 */
export interface ChatCompletionParams<T> {
  systemMessage: string
  userMessage: string
  responseSchema: ResponseSchema<T>
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Response schema definition for structured outputs
 */
export interface ResponseSchema<T> {
  name: string
  schema: z.ZodType<T>
}

/**
 * Message in chat conversation
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

/**
 * Request payload sent to OpenRouter API
 */
export interface OpenRouterRequestPayload {
  model: string
  messages: ChatMessage[]
  response_format?: OpenRouterResponseFormat
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

/**
 * JSON Schema response format configuration
 */
export interface OpenRouterResponseFormat {
  type: "json_schema"
  json_schema: {
    name: string
    strict: boolean
    schema: Record<string, unknown>
  }
}

/**
 * Raw response from OpenRouter API
 */
export interface OpenRouterRawResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: {
      role: "assistant"
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Error codes for OpenRouter service
 */
export type OpenRouterErrorCode =
  | "CONFIG_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "BAD_REQUEST"
  | "MODEL_NOT_FOUND"
  | "EMPTY_RESPONSE"
  | "INVALID_JSON"
  | "VALIDATION_FAILED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN_ERROR"
