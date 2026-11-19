/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The SDK calls the relative `/api`; in development the backend serves it on its own port.
  // `mise daemons` sets BACKEND_PORT for every daemon, so each worktree reaches its own backend.
  server: {
    proxy: { "/api": `http://127.0.0.1:${process.env.BACKEND_PORT ?? 3000}` },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    unstubGlobals: true,
  },
});
