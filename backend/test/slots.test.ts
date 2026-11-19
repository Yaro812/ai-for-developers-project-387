import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { BookingWindowDay } from "../src/generated/types.gen.ts";
import { buildTestApp } from "./app.ts";

// Only `Date` is faked: the server reads the current moment from the runtime clock.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

async function appWithEventType(durationMinutes: number) {
  const app = buildTestApp();
  await app.inject({
    method: "POST",
    url: "/api/event-types",
    payload: { id: "call", title: "Звонок", durationMinutes },
  });
  return app;
}

async function listSlots(app: FastifyInstance) {
  const response = await app.inject({ method: "GET", url: "/api/event-types/call/slots" });
  expect(response.statusCode).toBe(200);
  return response.json<BookingWindowDay[]>();
}

test("the booking window is 14 days from today in Moscow", async () => {
  // Wednesday, 12:00 in Moscow.
  vi.setSystemTime("2026-11-18T09:00:00Z");
  const app = await appWithEventType(60);

  const days = await listSlots(app);

  expect(days.map(({ date }) => date)).toEqual([
    "2026-11-18",
    "2026-11-19",
    "2026-11-20",
    "2026-11-21",
    "2026-11-22",
    "2026-11-23",
    "2026-11-24",
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
    "2026-11-28",
    "2026-11-29",
    "2026-11-30",
    "2026-12-01",
  ]);
});

test("a weekday has 60-minute slots every 15 minutes from 09:00, the last starting at 17:00", async () => {
  vi.setSystemTime("2026-11-18T09:00:00Z");
  const app = await appWithEventType(60);

  const [, thursday] = await listSlots(app);

  expect(thursday.date).toBe("2026-11-19");
  expect(thursday.slots.slice(0, 2)).toEqual([
    { start: "2026-11-19T06:00:00.000Z", end: "2026-11-19T07:00:00.000Z", free: true },
    { start: "2026-11-19T06:15:00.000Z", end: "2026-11-19T07:15:00.000Z", free: true },
  ]);
  expect(thursday.slots.at(-1)).toEqual({
    start: "2026-11-19T14:00:00.000Z",
    end: "2026-11-19T15:00:00.000Z",
    free: true,
  });
  const starts = thursday.slots.map(({ start }) => Date.parse(start));
  expect(starts.slice(1).map((start, index) => start - starts[index])).toEqual(
    Array(32).fill(15 * 60 * 1000),
  );
});

test("a 540-minute call has the single slot 09:00–18:00 a day", async () => {
  vi.setSystemTime("2026-11-18T09:00:00Z");
  const app = await appWithEventType(540);

  const [, thursday] = await listSlots(app);

  expect(thursday.slots).toEqual([
    { start: "2026-11-19T06:00:00.000Z", end: "2026-11-19T15:00:00.000Z", free: true },
  ]);
});

test("weekends stay in the window with no slots", async () => {
  vi.setSystemTime("2026-11-18T09:00:00Z");
  const app = await appWithEventType(60);

  const days = await listSlots(app);

  expect(days.filter(({ slots }) => slots.length === 0).map(({ date }) => date)).toEqual([
    "2026-11-21",
    "2026-11-22",
    "2026-11-28",
    "2026-11-29",
  ]);
});

test("today has only slots starting after the current moment", async () => {
  // 10:15 in Moscow: the 10:15 slot starts at the current moment and is gone.
  vi.setSystemTime("2026-11-18T07:15:00Z");
  const app = await appWithEventType(60);

  const [today] = await listSlots(app);

  expect(today.slots[0]).toEqual({
    start: "2026-11-18T07:30:00.000Z",
    end: "2026-11-18T08:30:00.000Z",
    free: true,
  });
});

test("today has no slots once the working hours are over", async () => {
  vi.setSystemTime("2026-11-18T14:01:00Z");
  const app = await appWithEventType(60);

  const [today] = await listSlots(app);

  expect(today).toEqual({ date: "2026-11-18", slots: [] });
});

test("at 23:30 UTC the window starts with the next day in Moscow", async () => {
  // 02:30 on Thursday in Moscow, still Wednesday in UTC.
  vi.setSystemTime("2026-11-18T23:30:00Z");
  const app = await appWithEventType(60);

  const days = await listSlots(app);

  expect(days[0].date).toBe("2026-11-19");
  expect(days[0].slots[0]).toEqual({
    start: "2026-11-19T06:00:00.000Z",
    end: "2026-11-19T07:00:00.000Z",
    free: true,
  });
  expect(days.at(-1)?.date).toBe("2026-12-02");
});

test("an unknown event type has no slots", async () => {
  const app = await appWithEventType(60);

  const response = await app.inject({ method: "GET", url: "/api/event-types/review-90/slots" });

  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({
    statusCode: 404,
    code: "EVENT_TYPE_NOT_FOUND",
    error: "Not Found",
    message: expect.any(String),
  });
});
