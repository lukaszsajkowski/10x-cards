/**
 * MSW setup for tests that need API mocking.
 *
 * Import this file in your test when you need to mock API calls:
 *
 * @example
 * ```ts
 * import { server } from '@/test/setup-msw';
 * import { http, HttpResponse } from 'msw';
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 *
 * test('should handle API response', async () => {
 *   server.use(
 *     http.get('/api/data', () => HttpResponse.json({ foo: 'bar' }))
 *   );
 *   // ... your test
 * });
 * ```
 */

import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

export { server };
export { http, HttpResponse } from "msw";

/**
 * Setup MSW server for the test file.
 * Call this function at the top level of your test file.
 */
export function setupMSW() {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
}
