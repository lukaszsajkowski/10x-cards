import { describe, expect, it } from "vitest"

import {
  OpenRouterAuthError,
  OpenRouterConfigError,
  OpenRouterError,
  OpenRouterNetworkError,
  OpenRouterRateLimitError,
} from "./openrouter.errors"

describe("OpenRouterError hierarchy", () => {
  it("sets name and code for config errors", () => {
    const error = new OpenRouterConfigError("missing api key")

    expect(error.name).toBe("OpenRouterConfigError")
    expect(error.code).toBe("CONFIG_ERROR")
  })

  it("tracks retryAfter for rate limit errors", () => {
    const error = new OpenRouterRateLimitError("slow down", "RATE_LIMITED", 5)

    expect(error.retryAfter).toBe(5)
    expect(error.code).toBe("RATE_LIMITED")
    expect(error.name).toBe("OpenRouterRateLimitError")
  })

  it("supports specific auth codes", () => {
    const error = new OpenRouterAuthError("forbidden", "FORBIDDEN")

    expect(error.code).toBe("FORBIDDEN")
    expect(error.name).toBe("OpenRouterAuthError")
  })

  it("captures cause for network errors", () => {
    const underlying = new Error("timeout")
    const base = new OpenRouterError("network down", "NETWORK_ERROR", underlying)
    expect(base.cause).toBe(underlying)

    const error = new OpenRouterNetworkError("network down", "TIMEOUT")
    expect(error.code).toBe("TIMEOUT")
    expect(error.name).toBe("OpenRouterNetworkError")
    expect(error.cause).toBeUndefined()
  })
})

