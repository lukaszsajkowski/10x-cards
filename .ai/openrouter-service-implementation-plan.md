# Plan Implementacji Usługi OpenRouter

## 1. Opis Usługi

Usługa `OpenRouterService` jest odpowiedzialna za komunikację z API OpenRouter w celu generowania propozycji fiszek na podstawie tekstu źródłowego. Usługa hermetyzuje logikę budowania zapytań, konfiguracji modelu, obsługi ustrukturyzowanych odpowiedzi (JSON Schema) oraz obsługi błędów.

### Główne odpowiedzialności

- Budowanie i wysyłanie zapytań do OpenRouter Chat Completions API
- Konfiguracja komunikatów systemowych i użytkownika
- Wymuszanie ustrukturyzowanych odpowiedzi poprzez `response_format` (JSON Schema)
- Parsowanie i walidacja odpowiedzi z API
- Obsługa błędów sieciowych, limitów rate oraz błędów API
- Implementacja mechanizmu retry z wykładniczym backoff

### Lokalizacja plików

Zgodnie ze strukturą projektu:

- `./src/lib/openrouter.service.ts` - główna klasa usługi
- `./src/lib/openrouter.types.ts` - typy i interfejsy
- `./src/lib/openrouter.schema.ts` - schematy Zod do walidacji

---

## 2. Opis Konstruktora

```typescript
interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  timeout?: number
  maxRetries?: number
}

class OpenRouterService {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultModel: string
  private readonly defaultTemperature: number
  private readonly defaultMaxTokens: number
  private readonly timeout: number
  private readonly maxRetries: number

  constructor(config: OpenRouterConfig) {
    // Walidacja wymaganych parametrów
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
}
```

### Parametry konfiguracyjne

| Parametr | Typ | Wymagany | Domyślna wartość | Opis |
|----------|-----|----------|------------------|------|
| `apiKey` | `string` | Tak | - | Klucz API OpenRouter |
| `baseUrl` | `string` | Nie | `https://openrouter.ai/api/v1` | Bazowy URL API |
| `defaultModel` | `string` | Nie | `openai/gpt-4o-mini` | Domyślny model do użycia |
| `defaultTemperature` | `number` | Nie | `0.7` | Domyślna temperatura generowania |
| `defaultMaxTokens` | `number` | Nie | `4096` | Domyślna maksymalna liczba tokenów |
| `timeout` | `number` | Nie | `60000` (60s) | Timeout żądania w ms |
| `maxRetries` | `number` | Nie | `3` | Maksymalna liczba ponowień |

---

## 3. Publiczne Metody i Pola

### 3.1 `chatCompletion<T>`

Główna metoda do wykonywania zapytań chat completion z ustrukturyzowaną odpowiedzią.

```typescript
interface ChatCompletionParams<T> {
  systemMessage: string
  userMessage: string
  responseSchema: ResponseSchema<T>
  model?: string
  temperature?: number
  maxTokens?: number
}

interface ResponseSchema<T> {
  name: string
  schema: z.ZodType<T>
}

async chatCompletion<T>(params: ChatCompletionParams<T>): Promise<T>
```

**Przykład użycia:**

```typescript
// Definicja schematu Zod dla odpowiedzi
const flashcardProposalsSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string().max(200),
      back: z.string().max(500),
    })
  ),
})

type FlashcardProposals = z.infer<typeof flashcardProposalsSchema>

// Wywołanie metody
const result = await openRouterService.chatCompletion<FlashcardProposals>({
  systemMessage: `Jesteś ekspertem w tworzeniu fiszek edukacyjnych. 
    Twoim zadaniem jest wygenerowanie fiszek na podstawie dostarczonego tekstu.
    Każda fiszka powinna mieć:
    - front: pytanie lub zagadnienie (max 200 znaków)
    - back: odpowiedź lub wyjaśnienie (max 500 znaków)`,
  userMessage: `Wygeneruj fiszki na podstawie poniższego tekstu:\n\n${sourceText}`,
  responseSchema: {
    name: "flashcard_proposals",
    schema: flashcardProposalsSchema,
  },
  model: "openai/gpt-4o-mini",
  temperature: 0.7,
})
```

### 3.2 `setModel`

Ustawia domyślny model dla kolejnych zapytań.

```typescript
setModel(modelName: string): void
```

### 3.3 `getAvailableModels`

Zwraca listę dostępnych modeli (opcjonalne rozszerzenie).

```typescript
async getAvailableModels(): Promise<string[]>
```

---

## 4. Prywatne Metody i Pola

### 4.1 `buildRequestPayload`

Buduje pełny payload żądania do API OpenRouter.

```typescript
private buildRequestPayload<T>(
  params: ChatCompletionParams<T>
): OpenRouterRequestPayload {
  return {
    model: params.model ?? this.defaultModel,
    messages: [
      { role: "system", content: params.systemMessage },
      { role: "user", content: params.userMessage },
    ],
    response_format: this.buildResponseFormat(params.responseSchema),
    temperature: params.temperature ?? this.defaultTemperature,
    max_tokens: params.maxTokens ?? this.defaultMaxTokens,
  }
}
```

### 4.2 `buildResponseFormat`

Buduje obiekt `response_format` z JSON Schema zgodny z wymaganiami OpenRouter.

```typescript
private buildResponseFormat<T>(
  responseSchema: ResponseSchema<T>
): OpenRouterResponseFormat {
  // Konwersja schematu Zod do JSON Schema
  const jsonSchema = zodToJsonSchema(responseSchema.schema, {
    name: responseSchema.name,
    $refStrategy: "none",
  })

  return {
    type: "json_schema",
    json_schema: {
      name: responseSchema.name,
      strict: true,
      schema: jsonSchema,
    },
  }
}
```

**Przykład wygenerowanego `response_format`:**

```typescript
{
  type: "json_schema",
  json_schema: {
    name: "flashcard_proposals",
    strict: true,
    schema: {
      type: "object",
      properties: {
        flashcards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: { type: "string", maxLength: 200 },
              back: { type: "string", maxLength: 500 }
            },
            required: ["front", "back"],
            additionalProperties: false
          }
        }
      },
      required: ["flashcards"],
      additionalProperties: false
    }
  }
}
```

### 4.3 `executeRequest`

Wykonuje żądanie HTTP z obsługą retry i timeout.

```typescript
private async executeRequest(
  payload: OpenRouterRequestPayload
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
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://your-app-url.com", // Opcjonalne
          "X-Title": "10x-cards", // Opcjonalne - nazwa aplikacji
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw await this.handleHttpError(response, attempt)
      }
      
      return await response.json()
    } catch (error) {
      lastError = error as Error
      
      if (!this.isRetryable(error) || attempt === this.maxRetries) {
        throw error
      }
      
      await this.delay(this.calculateBackoff(attempt))
    }
  }
  
  throw lastError
}
```

### 4.4 `parseResponse`

Parsuje i waliduje odpowiedź z API.

```typescript
private parseResponse<T>(
  rawResponse: OpenRouterRawResponse,
  schema: z.ZodType<T>
): T {
  const content = rawResponse.choices?.[0]?.message?.content
  
  if (!content) {
    throw new OpenRouterResponseError(
      "Empty response content from API",
      "EMPTY_RESPONSE"
    )
  }
  
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new OpenRouterResponseError(
      "Failed to parse JSON response",
      "INVALID_JSON"
    )
  }
  
  const validated = schema.safeParse(parsed)
  
  if (!validated.success) {
    throw new OpenRouterResponseError(
      `Response validation failed: ${validated.error.message}`,
      "VALIDATION_FAILED"
    )
  }
  
  return validated.data
}
```

### 4.5 `handleHttpError`

Mapuje kody HTTP na odpowiednie błędy.

```typescript
private async handleHttpError(
  response: Response,
  attempt: number
): Promise<OpenRouterError> {
  const errorBody = await response.json().catch(() => ({}))
  
  switch (response.status) {
    case 400:
      return new OpenRouterRequestError(
        errorBody.error?.message ?? "Invalid request",
        "BAD_REQUEST"
      )
    case 401:
      return new OpenRouterAuthError(
        "Invalid API key",
        "UNAUTHORIZED"
      )
    case 402:
      return new OpenRouterQuotaError(
        "Insufficient credits",
        "QUOTA_EXCEEDED"
      )
    case 429:
      return new OpenRouterRateLimitError(
        "Rate limit exceeded",
        "RATE_LIMITED",
        parseInt(response.headers.get("retry-after") ?? "60")
      )
    case 500:
    case 502:
    case 503:
      return new OpenRouterServerError(
        `Server error: ${response.status}`,
        "SERVER_ERROR"
      )
    default:
      return new OpenRouterError(
        `HTTP error: ${response.status}`,
        "UNKNOWN_ERROR"
      )
  }
}
```

### 4.6 `isRetryable`

Określa, czy błąd kwalifikuje się do ponowienia.

```typescript
private isRetryable(error: unknown): boolean {
  if (error instanceof OpenRouterRateLimitError) return true
  if (error instanceof OpenRouterServerError) return true
  if (error instanceof Error && error.name === "AbortError") return true
  return false
}
```

### 4.7 `calculateBackoff`

Oblicza opóźnienie dla wykładniczego backoff.

```typescript
private calculateBackoff(attempt: number): number {
  const baseDelay = 1000 // 1 sekunda
  const maxDelay = 30000 // 30 sekund
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
  // Dodaj jitter (±20%)
  return delay * (0.8 + Math.random() * 0.4)
}
```

### 4.8 `delay`

Pomocnicza metoda do opóźnień.

```typescript
private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

---

## 5. Obsługa Błędów

### 5.1 Hierarchia klas błędów

```typescript
// Bazowy błąd OpenRouter
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: OpenRouterErrorCode,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "OpenRouterError"
  }
}

// Błąd konfiguracji
export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR")
    this.name = "OpenRouterConfigError"
  }
}

// Błąd autentykacji
export class OpenRouterAuthError extends OpenRouterError {
  constructor(message: string, code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(message, code)
    this.name = "OpenRouterAuthError"
  }
}

// Błąd limitów
export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string,
    code: "RATE_LIMITED",
    public readonly retryAfter: number
  ) {
    super(message, code)
    this.name = "OpenRouterRateLimitError"
  }
}

// Błąd przekroczenia quota
export class OpenRouterQuotaError extends OpenRouterError {
  constructor(message: string, code: "QUOTA_EXCEEDED") {
    super(message, code)
    this.name = "OpenRouterQuotaError"
  }
}

// Błąd żądania
export class OpenRouterRequestError extends OpenRouterError {
  constructor(message: string, code: "BAD_REQUEST" | "MODEL_NOT_FOUND") {
    super(message, code)
    this.name = "OpenRouterRequestError"
  }
}

// Błąd odpowiedzi
export class OpenRouterResponseError extends OpenRouterError {
  constructor(
    message: string,
    code: "EMPTY_RESPONSE" | "INVALID_JSON" | "VALIDATION_FAILED"
  ) {
    super(message, code)
    this.name = "OpenRouterResponseError"
  }
}

// Błąd serwera
export class OpenRouterServerError extends OpenRouterError {
  constructor(message: string, code: "SERVER_ERROR") {
    super(message, code)
    this.name = "OpenRouterServerError"
  }
}

// Błąd sieci/timeout
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string, code: "NETWORK_ERROR" | "TIMEOUT") {
    super(message, code)
    this.name = "OpenRouterNetworkError"
  }
}
```

### 5.2 Typy kodów błędów

```typescript
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
```

### 5.3 Scenariusze obsługi błędów

| Scenariusz | Kod błędu | Retry | Działanie |
|------------|-----------|-------|-----------|
| Brak klucza API | `CONFIG_ERROR` | Nie | Rzuć błąd natychmiast |
| Nieprawidłowy klucz API | `UNAUTHORIZED` | Nie | Rzuć błąd, zaloguj |
| Rate limit | `RATE_LIMITED` | Tak | Czekaj `retryAfter` sekund |
| Przekroczenie quota | `QUOTA_EXCEEDED` | Nie | Rzuć błąd, powiadom użytkownika |
| Nieprawidłowe żądanie | `BAD_REQUEST` | Nie | Rzuć błąd z detalami |
| Model niedostępny | `MODEL_NOT_FOUND` | Nie | Rzuć błąd, użyj fallback |
| Pusta odpowiedź | `EMPTY_RESPONSE` | Tak | Ponów żądanie |
| Nieprawidłowy JSON | `INVALID_JSON` | Tak | Ponów żądanie |
| Błąd walidacji | `VALIDATION_FAILED` | Nie | Rzuć błąd z detalami |
| Błąd serwera (5xx) | `SERVER_ERROR` | Tak | Ponów z backoff |
| Timeout | `TIMEOUT` | Tak | Ponów z backoff |
| Błąd sieci | `NETWORK_ERROR` | Tak | Ponów z backoff |

---

## 6. Kwestie Bezpieczeństwa

### 6.1 Zarządzanie kluczem API

```typescript
// W pliku .env (nie commitować!)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx

// W pliku src/lib/openrouter.service.ts
const apiKey = import.meta.env.OPENROUTER_API_KEY

if (!apiKey) {
  throw new OpenRouterConfigError(
    "OPENROUTER_API_KEY environment variable is not set"
  )
}

export const openRouterService = new OpenRouterService({ apiKey })
```

### 6.2 Walidacja danych wejściowych

- Zawsze waliduj `sourceText` przed wysłaniem do API
- Ogranicz długość tekstu (np. max 10000 znaków)
- Sanityzuj dane wejściowe aby uniknąć prompt injection

```typescript
const MAX_SOURCE_TEXT_LENGTH = 10000

function validateSourceText(text: string): void {
  if (!text || typeof text !== "string") {
    throw new Error("Source text is required")
  }
  
  if (text.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new Error(`Source text exceeds maximum length of ${MAX_SOURCE_TEXT_LENGTH}`)
  }
}
```

### 6.3 Ochrona przed wyciekiem danych

- Nie loguj pełnych żądań/odpowiedzi w produkcji
- Maskuj klucz API w logach
- Nie zwracaj surowych błędów API do użytkownika

```typescript
private logError(error: OpenRouterError, context?: Record<string, unknown>): void {
  const safeContext = {
    ...context,
    apiKey: "[REDACTED]",
  }
  
  console.error(`[OpenRouter] ${error.code}: ${error.message}`, safeContext)
}
```

### 6.4 Rate limiting po stronie aplikacji

Rozważ implementację własnego rate limitera:

```typescript
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async checkLimit(): Promise<void> {
    const now = Date.now()
    this.requests = this.requests.filter(t => t > now - this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      throw new OpenRouterRateLimitError(
        "Application rate limit exceeded",
        "RATE_LIMITED",
        Math.ceil((this.requests[0] + this.windowMs - now) / 1000)
      )
    }
    
    this.requests.push(now)
  }
}
```

---

## 7. Plan Wdrożenia Krok po Kroku

### Krok 1: Przygotowanie typów i schematów

Utwórz plik `./src/lib/openrouter.types.ts`:

```typescript
import type { z } from "zod"

// Konfiguracja serwisu
export interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  defaultTemperature?: number
  defaultMaxTokens?: number
  timeout?: number
  maxRetries?: number
}

// Parametry chat completion
export interface ChatCompletionParams<T> {
  systemMessage: string
  userMessage: string
  responseSchema: ResponseSchema<T>
  model?: string
  temperature?: number
  maxTokens?: number
}

// Schemat odpowiedzi
export interface ResponseSchema<T> {
  name: string
  schema: z.ZodType<T>
}

// Wiadomość w konwersacji
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

// Payload żądania do OpenRouter
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

// Format odpowiedzi JSON Schema
export interface OpenRouterResponseFormat {
  type: "json_schema"
  json_schema: {
    name: string
    strict: boolean
    schema: Record<string, unknown>
  }
}

// Surowa odpowiedź z API
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

// Kody błędów
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
```

### Krok 2: Implementacja klas błędów

Utwórz plik `./src/lib/openrouter.errors.ts`:

```typescript
import type { OpenRouterErrorCode } from "./openrouter.types"

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: OpenRouterErrorCode,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "OpenRouterError"
  }
}

export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR")
    this.name = "OpenRouterConfigError"
  }
}

export class OpenRouterAuthError extends OpenRouterError {
  constructor(message: string, code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(message, code)
    this.name = "OpenRouterAuthError"
  }
}

export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string,
    code: "RATE_LIMITED",
    public readonly retryAfter: number
  ) {
    super(message, code)
    this.name = "OpenRouterRateLimitError"
  }
}

export class OpenRouterQuotaError extends OpenRouterError {
  constructor(message: string, code: "QUOTA_EXCEEDED") {
    super(message, code)
    this.name = "OpenRouterQuotaError"
  }
}

export class OpenRouterRequestError extends OpenRouterError {
  constructor(message: string, code: "BAD_REQUEST" | "MODEL_NOT_FOUND") {
    super(message, code)
    this.name = "OpenRouterRequestError"
  }
}

export class OpenRouterResponseError extends OpenRouterError {
  constructor(
    message: string,
    code: "EMPTY_RESPONSE" | "INVALID_JSON" | "VALIDATION_FAILED"
  ) {
    super(message, code)
    this.name = "OpenRouterResponseError"
  }
}

export class OpenRouterServerError extends OpenRouterError {
  constructor(message: string, code: "SERVER_ERROR") {
    super(message, code)
    this.name = "OpenRouterServerError"
  }
}

export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string, code: "NETWORK_ERROR" | "TIMEOUT") {
    super(message, code)
    this.name = "OpenRouterNetworkError"
  }
}
```

### Krok 3: Implementacja głównej klasy serwisu

Utwórz plik `./src/lib/openrouter.service.ts`:

```typescript
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

  async chatCompletion<T>(params: ChatCompletionParams<T>): Promise<T> {
    const payload = this.buildRequestPayload(params)
    const rawResponse = await this.executeRequest(payload)
    return this.parseResponse(rawResponse, params.responseSchema.schema)
  }

  private buildRequestPayload<T>(
    params: ChatCompletionParams<T>
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

  private buildResponseFormat<T>(
    responseSchema: ResponseSchema<T>
  ): OpenRouterResponseFormat {
    const jsonSchema = zodToJsonSchema(responseSchema.schema, {
      name: responseSchema.name,
      $refStrategy: "none",
    })

    // Usuń metadane dodane przez zod-to-json-schema
    const { $schema, definitions, ...schema } = jsonSchema as Record<
      string,
      unknown
    >

    return {
      type: "json_schema",
      json_schema: {
        name: responseSchema.name,
        strict: true,
        schema: schema,
      },
    }
  }

  private async executeRequest(
    payload: OpenRouterRequestPayload
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
            lastError = new OpenRouterNetworkError(
              "Request timed out",
              "TIMEOUT"
            )
          } else {
            lastError = new OpenRouterNetworkError(
              error.message,
              "NETWORK_ERROR"
            )
          }

          if (attempt === this.maxRetries) {
            throw lastError
          }
        }

        await this.delay(this.calculateBackoff(attempt))
      }
    }

    throw (
      lastError ??
      new OpenRouterError("Max retries exceeded", "UNKNOWN_ERROR")
    )
  }

  private parseResponse<T>(
    rawResponse: OpenRouterRawResponse,
    schema: import("zod").ZodType<T>
  ): T {
    const content = rawResponse.choices?.[0]?.message?.content

    if (!content) {
      throw new OpenRouterResponseError(
        "Empty response content from API",
        "EMPTY_RESPONSE"
      )
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(content)
    } catch {
      throw new OpenRouterResponseError(
        "Failed to parse JSON response",
        "INVALID_JSON"
      )
    }

    const validated = schema.safeParse(parsed)

    if (!validated.success) {
      throw new OpenRouterResponseError(
        `Response validation failed: ${validated.error.message}`,
        "VALIDATION_FAILED"
      )
    }

    return validated.data
  }

  private async handleHttpError(response: Response): Promise<OpenRouterError> {
    let errorBody: { error?: { message?: string } } = {}

    try {
      errorBody = await response.json()
    } catch {
      // Ignoruj błąd parsowania
    }

    const errorMessage = errorBody.error?.message ?? "Unknown error"

    switch (response.status) {
      case 400:
        return new OpenRouterRequestError(errorMessage, "BAD_REQUEST")
      case 401:
        return new OpenRouterAuthError("Invalid API key", "UNAUTHORIZED")
      case 402:
        return new OpenRouterQuotaError(
          "Insufficient credits",
          "QUOTA_EXCEEDED"
        )
      case 403:
        return new OpenRouterAuthError("Access forbidden", "FORBIDDEN")
      case 404:
        return new OpenRouterRequestError(
          "Model not found",
          "MODEL_NOT_FOUND"
        )
      case 429: {
        const retryAfter = parseInt(
          response.headers.get("retry-after") ?? "60",
          10
        )
        return new OpenRouterRateLimitError(
          "Rate limit exceeded",
          "RATE_LIMITED",
          retryAfter
        )
      }
      case 500:
      case 502:
      case 503:
        return new OpenRouterServerError(
          `Server error: ${response.status}`,
          "SERVER_ERROR"
        )
      default:
        return new OpenRouterError(
          `HTTP error: ${response.status} - ${errorMessage}`,
          "UNKNOWN_ERROR"
        )
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof OpenRouterRateLimitError) return true
    if (error instanceof OpenRouterServerError) return true
    if (error instanceof OpenRouterNetworkError) return true
    return false
  }

  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000
    const maxDelay = 30000
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    // Dodaj jitter (±20%)
    return delay * (0.8 + Math.random() * 0.4)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Eksport instancji singleton
const apiKey = import.meta.env.OPENROUTER_API_KEY

if (!apiKey) {
  console.warn(
    "OPENROUTER_API_KEY is not set. OpenRouter service will not be available."
  )
}

export const openRouterService = apiKey
  ? new OpenRouterService({ apiKey })
  : null
```

### Krok 4: Aktualizacja zmiennych środowiskowych

Dodaj do pliku `.env`:

```bash
# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

Dodaj do pliku `.env.example`:

```bash
# OpenRouter API
OPENROUTER_API_KEY=
```

### Krok 5: Integracja z GenerationService

Zaktualizuj `./src/lib/generation.service.ts`:

```typescript
import { z } from "zod"

import { openRouterService } from "./openrouter.service"
import type { GenerationFlashcardProposalDto } from "../types"

// Schemat odpowiedzi z AI
const flashcardProposalsSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string().min(1).max(200),
      back: z.string().min(1).max(500),
    })
  ).min(1).max(10),
})

type FlashcardProposals = z.infer<typeof flashcardProposalsSchema>

// W klasie GenerationService, zastąp metodę generateWithMockAi:
private async generateFlashcards(
  sourceText: string
): Promise<GenerationFlashcardProposalDto[]> {
  if (!openRouterService) {
    throw new GenerationServiceError(
      "OpenRouter service is not configured",
      "AI_GENERATION_FAILED"
    )
  }

  const systemMessage = `Jesteś ekspertem w tworzeniu fiszek edukacyjnych. 
Twoim zadaniem jest analiza dostarczonego tekstu i wygenerowanie zestawu fiszek.

Zasady tworzenia fiszek:
1. Każda fiszka powinna testować jedną konkretną informację
2. Pytania (front) powinny być jasne i jednoznaczne
3. Odpowiedzi (back) powinny być zwięzłe, ale kompletne
4. Unikaj pytań zbyt ogólnych lub zbyt szczegółowych
5. Wygeneruj od 3 do 10 fiszek w zależności od ilości materiału

Format odpowiedzi: JSON z tablicą fiszek.`

  const userMessage = `Wygeneruj fiszki edukacyjne na podstawie poniższego tekstu:

${sourceText}`

  const result = await openRouterService.chatCompletion<FlashcardProposals>({
    systemMessage,
    userMessage,
    responseSchema: {
      name: "flashcard_proposals",
      schema: flashcardProposalsSchema,
    },
    model: "openai/gpt-4o-mini",
    temperature: 0.7,
  })

  return result.flashcards.map((flashcard) => ({
    front: flashcard.front,
    back: flashcard.back,
    source: "ai-full" as const,
  }))
}
```

### Krok 6: Instalacja zależności

```bash
npm install zod-to-json-schema
```

### Krok 7: Testowanie

Utwórz plik testowy do weryfikacji integracji:

```typescript
// scripts/test-openrouter.ts
import { openRouterService } from "../src/lib/openrouter.service"
import { z } from "zod"

const testSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    })
  ),
})

async function testOpenRouter() {
  if (!openRouterService) {
    console.error("OpenRouter service not configured")
    return
  }

  try {
    const result = await openRouterService.chatCompletion({
      systemMessage: "You are a helpful assistant that creates flashcards.",
      userMessage: "Create 2 flashcards about TypeScript.",
      responseSchema: {
        name: "flashcards",
        schema: testSchema,
      },
    })

    console.log("Success:", JSON.stringify(result, null, 2))
  } catch (error) {
    console.error("Error:", error)
  }
}

testOpenRouter()
```

---

## Podsumowanie

Ten przewodnik implementacji zapewnia kompletne rozwiązanie do integracji z OpenRouter API. Kluczowe elementy to:

1. **Typowanie** - pełne wsparcie TypeScript dla wszystkich komponentów
2. **Walidacja** - wykorzystanie Zod do walidacji odpowiedzi
3. **Obsługa błędów** - hierarchia klas błędów z kodami i retry logic
4. **Bezpieczeństwo** - zarządzanie kluczem API przez zmienne środowiskowe
5. **Elastyczność** - konfigurowalny model, temperatura i inne parametry
6. **Niezawodność** - mechanizm retry z wykładniczym backoff

Implementacja jest zgodna z istniejącą architekturą projektu i wzorcami używanymi w innych serwisach (np. `GenerationService`).
