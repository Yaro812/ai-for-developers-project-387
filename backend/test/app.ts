import responseValidation from "@fastify/response-validation";
import ajvFormats from "ajv-formats";
import { buildApp } from "../src/app.ts";

// A response outside the contract schema becomes a 500, so the test that sent the request fails.
export function buildTestApp(frontendRoot?: string) {
  return buildApp({ frontendRoot }, (app) =>
    app.register(responseValidation, { ajv: { plugins: [ajvFormats.default] } }),
  );
}
