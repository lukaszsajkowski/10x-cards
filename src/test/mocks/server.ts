import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server instance for Node.js environment (Vitest tests).
 *
 * This server intercepts network requests and responds with mock data
 * defined in the handlers.
 */
export const server = setupServer(...handlers);
