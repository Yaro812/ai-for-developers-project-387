import { defineConfig } from "@hey-api/openapi-ts";

// Generated folders are git-ignored and never edited by hand. Imports end in `.ts`,
// because Node runs the backend without a build step.
// No date transformer: it would turn `plainDate` into a `Date` at UTC midnight.
export default defineConfig([
  {
    input: "openapi.yaml",
    output: { path: "../frontend/src/generated", module: { extension: ".ts" } },
    // No base URL: the SDK calls the relative `/api` on the page's origin.
    plugins: [
      "@hey-api/typescript",
      "@hey-api/sdk",
      { name: "@hey-api/client-fetch", baseUrl: false },
    ],
  },
  {
    input: "openapi.yaml",
    output: { path: "../backend/src/generated", module: { extension: ".ts" } },
    plugins: ["@hey-api/typescript", "fastify"],
  },
]);
