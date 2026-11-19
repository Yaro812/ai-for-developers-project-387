import { expect, test } from "vitest";
import { buildTestApp } from "./app.ts";

test("health check answers ok under /api", async () => {
  const response = await buildTestApp().inject({ method: "GET", url: "/api/health" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: "ok" });
});

test("health check left its old path", async () => {
  const response = await buildTestApp().inject({ method: "GET", url: "/health" });

  expect(response.statusCode).toBe(404);
});
