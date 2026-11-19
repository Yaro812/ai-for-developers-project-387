import type { FastifyInstance as App } from "fastify";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { buildTestApp } from "./app.ts";

// Only `Date` is faked: the server reads the current moment from the runtime clock.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Wednesday, 12:00 in Moscow.
  vi.setSystemTime("2026-11-18T09:00:00Z");
});

afterEach(() => {
  vi.useRealTimers();
});

// Fake guest addresses on the reserved example.com domain.
const email = (local: string) => `${local}@example.com`;

const introCall = { id: "intro-60", title: "Знакомство", durationMinutes: 60 };
const reviewCall = { id: "review-90", title: "Ревью проекта", durationMinutes: 90 };
const anna = { guestName: "Анна", guestEmail: email("anna") };
const boris = { guestName: "Борис", guestEmail: email("boris") };

async function appWithEventTypes() {
  const app = buildTestApp();
  for (const payload of [introCall, reviewCall]) {
    await app.inject({ method: "POST", url: "/api/event-types", payload });
  }
  return app;
}

async function book(app: App, eventTypeId: string, payload: object) {
  const response = await app.inject({
    method: "POST",
    url: `/api/event-types/${eventTypeId}/bookings`,
    payload,
  });
  expect(response.statusCode).toBe(201);
}

// Every booking is saved at the faked current moment of `beforeEach`.
const createdAt = "2026-11-18T09:00:00.000Z";

const upcomingBookings = (app: App) => app.inject({ method: "GET", url: "/api/bookings" });

test("bookings of every event type come in one list by start", async () => {
  const app = await appWithEventTypes();
  // Friday, 10:00 in Moscow, booked first.
  await book(app, "review-90", { start: "2026-11-20T07:00:00.000Z", ...anna });
  // Thursday, 10:00 in Moscow.
  await book(app, "intro-60", { start: "2026-11-19T07:00:00.000Z", ...boris });

  const response = await upcomingBookings(app);

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([
    {
      eventType: introCall,
      start: "2026-11-19T07:00:00.000Z",
      end: "2026-11-19T08:00:00.000Z",
      ...boris,
      createdAt,
    },
    {
      eventType: reviewCall,
      start: "2026-11-20T07:00:00.000Z",
      end: "2026-11-20T08:30:00.000Z",
      ...anna,
      createdAt,
    },
  ]);
});

test("an ongoing booking stays in the list until its end, a finished one leaves it", async () => {
  const app = await appWithEventTypes();
  // Today, 13:00–14:00 and 14:00–15:30 in Moscow.
  await book(app, "intro-60", { start: "2026-11-18T10:00:00.000Z", ...anna });
  await book(app, "review-90", { start: "2026-11-18T11:00:00.000Z", ...boris });

  // 14:30 in Moscow: the first call is over, the second is going on.
  vi.setSystemTime("2026-11-18T11:30:00Z");
  const during = await upcomingBookings(app);

  expect(during.json()).toEqual([
    {
      eventType: reviewCall,
      start: "2026-11-18T11:00:00.000Z",
      end: "2026-11-18T12:30:00.000Z",
      ...boris,
      createdAt,
    },
  ]);

  // 15:30 in Moscow: the second call has just ended.
  vi.setSystemTime("2026-11-18T12:30:00Z");
  const after = await upcomingBookings(app);

  expect(after.json()).toEqual([]);
});

test("no bookings give an empty list", async () => {
  const response = await upcomingBookings(buildTestApp());

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([]);
});
