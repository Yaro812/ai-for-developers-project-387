import { vi } from "vitest";

type Route = (request: Request) => Response | Promise<Response>;

/**
 * Replaces the API server for page tests: the real SDK sends its requests to this `fetch`,
 * which answers by `"<METHOD> <path>"`; a route gets the request to read its body.
 * A request without a route fails, like a network error.
 */
export function stubServer(routes: Record<string, Route>) {
  const fetch = vi.fn(async (request: Request) => {
    const route = routes[`${request.method} ${new URL(request.url).pathname}`];
    if (!route) throw new TypeError(`No stub for ${request.method} ${request.url}`);
    return route(request);
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
