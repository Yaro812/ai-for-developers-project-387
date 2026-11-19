import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { buildTestApp } from "./app.ts";

const indexHtml = "<!doctype html><title>Календарь звонков</title>";
const script = 'console.log("app");';
let frontendRoot: string;

// A stand-in for the built frontend, so the tests do not depend on `frontend/dist`.
beforeAll(async () => {
  frontendRoot = await mkdtemp(join(tmpdir(), "frontend-"));
  await writeFile(join(frontendRoot, "index.html"), indexHtml);
  await mkdir(join(frontendRoot, "assets"));
  await writeFile(join(frontendRoot, "assets", "app.js"), script);
});

afterAll(() => rm(frontendRoot, { recursive: true }));

test("an unknown path under /api answers a JSON 404, not the frontend", async () => {
  const response = await buildTestApp(frontendRoot).inject({
    method: "GET",
    url: "/api/no-such-route",
  });

  expect(response.statusCode).toBe(404);
  expect(response.headers["content-type"]).toMatch(/^application\/json/);
  expect(response.json()).toEqual({
    statusCode: 404,
    code: "ROUTE_NOT_FOUND",
    error: "Not Found",
    message: expect.any(String),
  });
});

test("a page path answers index.html, so a direct visit opens the page", async () => {
  const response = await buildTestApp(frontendRoot).inject({
    method: "GET",
    url: "/book/intro-30",
  });

  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toMatch(/^text\/html/);
  expect(response.body).toBe(indexHtml);
});

test("an existing frontend file is served as is", async () => {
  const response = await buildTestApp(frontendRoot).inject({
    method: "GET",
    url: "/assets/app.js",
  });

  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toMatch(/javascript/);
  expect(response.body).toBe(script);
});
