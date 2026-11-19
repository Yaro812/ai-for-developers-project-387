import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { client } from "./generated/client.gen.ts";
import { stubServer } from "./test-server.ts";

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

// The browser resolves the SDK's relative `/api` against the page; Node's `Request` needs an absolute URL.
client.setConfig({ baseUrl: window.location.origin });

// No test reaches a real server: until a test stubs a route, every request fails.
beforeEach(() => {
  stubServer({});
});

// jsdom has no matchMedia; MantineProvider reads it for the color scheme.
window.matchMedia = (query) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
