import type { AddressInfo } from "node:net";
import { createServer } from "node:net";
import { defineConfig, devices } from "@playwright/test";

// A free port for this run, so parallel worktrees never share a server. Workers load
// this file again and inherit the port through the environment instead of picking their own.
process.env.E2E_PORT ??= await new Promise<string>((resolve) => {
  const server = createServer().listen(0, "127.0.0.1", () => {
    const { port } = server.address() as AddressInfo;
    server.close(() => resolve(String(port)));
  });
});
const baseURL = `http://127.0.0.1:${process.env.E2E_PORT}`;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A fresh production build and server for every run: the storage starts empty.
  webServer: {
    command: "mise run start",
    env: { PORT: process.env.E2E_PORT },
    url: `${baseURL}/api/health`,
  },
});
