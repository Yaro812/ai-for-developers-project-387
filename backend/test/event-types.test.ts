import { expect, test } from "vitest";
import { buildTestApp } from "./app.ts";

type App = ReturnType<typeof buildTestApp>;

const introCall = {
  id: "intro-30",
  title: "Знакомство",
  description: "Обсудим задачу",
  durationMinutes: 30,
};
const { id: _id, ...withoutId } = introCall;
const { title: _title, ...withoutTitle } = introCall;
const { description: _description, ...withoutDescription } = introCall;
const { durationMinutes: _durationMinutes, ...withoutDuration } = introCall;

function createEventType(app: App, payload: object) {
  return app.inject({ method: "POST", url: "/api/event-types", payload });
}

async function listEventTypes(app: App) {
  return (await app.inject({ method: "GET", url: "/api/event-types" })).json();
}

const validationError = {
  statusCode: 400,
  code: "FST_ERR_VALIDATION",
  error: "Bad Request",
  message: expect.any(String),
};

const idTakenError = {
  statusCode: 409,
  code: "EVENT_TYPE_ID_TAKEN",
  error: "Conflict",
  message: expect.any(String),
};

test("a new app lists no event types", async () => {
  const response = await buildTestApp().inject({ method: "GET", url: "/api/event-types" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([]);
});

test("a created event type is answered with 201 and appears in the catalog", async () => {
  const app = buildTestApp();

  const response = await createEventType(app, introCall);

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual(introCall);
  expect(await listEventTypes(app)).toEqual([introCall]);
});

test.each([
  ["an id with capital letters", { ...introCall, id: "Intro-30" }],
  ["an id with an underscore", { ...introCall, id: "intro_30" }],
  ["an id starting with a hyphen", { ...introCall, id: "-intro" }],
  ["an id ending with a hyphen", { ...introCall, id: "intro-" }],
  ["an id with a double hyphen", { ...introCall, id: "intro--30" }],
  ["an empty id", { ...introCall, id: "" }],
  ["an id longer than 50 characters", { ...introCall, id: "a".repeat(51) }],
  ["no id", withoutId],
  ["no title", withoutTitle],
  ["an empty title", { ...introCall, title: "" }],
  ["a title of spaces only", { ...introCall, title: "   " }],
  ["a title longer than 100 characters", { ...introCall, title: "a".repeat(101) }],
  ["a title that is a number", { ...introCall, title: 123 }],
  ["a title that is a boolean", { ...introCall, title: true }],
  ["a description longer than 500 characters", { ...introCall, description: "a".repeat(501) }],
  ["a null description", { ...introCall, description: null }],
  ["no duration", withoutDuration],
  ["a duration below 15 minutes", { ...introCall, durationMinutes: 0 }],
  ["a duration above 540 minutes", { ...introCall, durationMinutes: 555 }],
  ["a duration not a multiple of 15", { ...introCall, durationMinutes: 20 }],
  ["a fractional duration", { ...introCall, durationMinutes: 22.5 }],
  ["a duration given as a string", { ...introCall, durationMinutes: "30" }],
])("%s is a data error and nothing is created", async (_, payload) => {
  const app = buildTestApp();

  const response = await createEventType(app, payload);

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual(validationError);
  expect(await listEventTypes(app)).toEqual([]);
});

test.each([
  ["the shortest", { id: "a", title: "a", description: "", durationMinutes: 15 }],
  [
    "the longest",
    {
      id: "a".repeat(50),
      title: "a".repeat(100),
      description: "a".repeat(500),
      durationMinutes: 540,
    },
  ],
])("%s allowed values are accepted", async (_, payload) => {
  const response = await createEventType(buildTestApp(), payload);

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual(payload);
});

test("an event type without a description has no description field", async () => {
  const app = buildTestApp();

  const response = await createEventType(app, withoutDescription);

  expect(response.json()).toStrictEqual(withoutDescription);
  expect(await listEventTypes(app)).toStrictEqual([withoutDescription]);
});

test("a repeated id is taken, and the first event type stays", async () => {
  const app = buildTestApp();
  await createEventType(app, introCall);

  const response = await createEventType(app, { ...introCall, title: "Другой звонок" });

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual(idTakenError);
  expect(await listEventTypes(app)).toEqual([introCall]);
});

test("a data error is reported before a taken id", async () => {
  const app = buildTestApp();
  await createEventType(app, introCall);

  const response = await createEventType(app, { ...introCall, title: "" });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual(validationError);
});

test("of two simultaneous requests with one id, the second finds the id taken", async () => {
  const app = buildTestApp();

  const responses = await Promise.all([
    createEventType(app, introCall),
    createEventType(app, { ...introCall, title: "Другой звонок" }),
  ]);

  expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
  expect(responses.find((response) => response.statusCode === 409)?.json()).toEqual(idTakenError);
  expect(await listEventTypes(app)).toHaveLength(1);
});

test("the catalog lists event types in creation order", async () => {
  const app = buildTestApp();
  const review = { id: "review-90", title: "Ревью проекта", durationMinutes: 90 };
  await createEventType(app, review);
  await createEventType(app, introCall);

  expect(await listEventTypes(app)).toEqual([review, introCall]);
});

test("a created event type is answered by its id", async () => {
  const app = buildTestApp();
  await createEventType(app, introCall);

  const response = await app.inject({ method: "GET", url: "/api/event-types/intro-30" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(introCall);
});

test.each([
  ["an id no event type has", "review-90"],
  ["an id breaking the id rule", "Intro_30"],
  ["an id longer than 50 characters", "a".repeat(51)],
])("%s is not found", async (_, id) => {
  const app = buildTestApp();
  await createEventType(app, introCall);

  const response = await app.inject({ method: "GET", url: `/api/event-types/${id}` });

  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({
    statusCode: 404,
    code: "EVENT_TYPE_NOT_FOUND",
    error: "Not Found",
    message: expect.any(String),
  });
});
