import type { FastifyInstance as App } from "fastify";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { BookingWindowDay } from "../src/generated/types.gen.ts";
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
const guest = { guestName: "Анна", guestEmail: email("anna") };

async function appWithEventTypes() {
  const app = buildTestApp();
  for (const payload of [introCall, reviewCall]) {
    await app.inject({ method: "POST", url: "/api/event-types", payload });
  }
  return app;
}

function createBooking(app: App, eventTypeId: string, payload: object) {
  return app.inject({
    method: "POST",
    url: `/api/event-types/${eventTypeId}/bookings`,
    payload,
  });
}

test("a booking is answered with 201, its event type and the end computed from the duration", async () => {
  const app = await appWithEventTypes();

  // Thursday, 10:00 in Moscow.
  const response = await createBooking(app, "review-90", {
    start: "2026-11-19T07:00:00.000Z",
    ...guest,
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual({
    eventType: reviewCall,
    start: "2026-11-19T07:00:00.000Z",
    end: "2026-11-19T08:30:00.000Z",
    ...guest,
    // The faked current moment.
    createdAt: "2026-11-18T09:00:00.000Z",
  });
});

test("a start with +03:00 and with Z for one moment books the same interval", async () => {
  const app = await appWithEventTypes();
  const other = await appWithEventTypes();

  const withOffset = await createBooking(app, "intro-60", {
    start: "2026-11-19T10:00:00+03:00",
    ...guest,
  });
  const inUtc = await createBooking(other, "intro-60", { start: "2026-11-19T07:00:00Z", ...guest });

  expect(withOffset.statusCode).toBe(201);
  expect(withOffset.json()).toEqual(inUtc.json());
  expect(withOffset.json()).toMatchObject({
    start: "2026-11-19T07:00:00.000Z",
    end: "2026-11-19T08:00:00.000Z",
  });
  // The moment, not the string, is booked.
  const again = await createBooking(app, "intro-60", { start: "2026-11-19T07:00:00Z", ...guest });
  expect(again.statusCode).toBe(409);
});

const validationError = {
  statusCode: 400,
  code: "FST_ERR_VALIDATION",
  error: "Bad Request",
  message: expect.any(String),
};
const notFoundError = {
  statusCode: 404,
  code: "EVENT_TYPE_NOT_FOUND",
  error: "Not Found",
  message: expect.any(String),
};
const unavailableError = {
  statusCode: 422,
  code: "TIME_UNAVAILABLE",
  error: "Unprocessable Entity",
  message: expect.any(String),
};
const conflictError = {
  statusCode: 409,
  code: "BOOKING_CONFLICT",
  error: "Conflict",
  message: expect.any(String),
};

// Thursday, 10:00 in Moscow: a free slot of both event types.
const request = { start: "2026-11-19T07:00:00.000Z", ...guest };
const { start: _start, ...withoutStart } = request;
const { guestName: _guestName, ...withoutName } = request;
const { guestEmail: _guestEmail, ...withoutEmail } = request;

test("an unknown event type cannot be booked", async () => {
  const app = await appWithEventTypes();

  const response = await createBooking(app, "missing", request);

  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual(notFoundError);
});

test.each([
  ["no start", withoutStart],
  ["a start that is not a moment", { ...request, start: "tomorrow" }],
  ["a start without an offset", { ...request, start: "2026-11-19T10:00:00" }],
  ["no name", withoutName],
  ["an empty name", { ...request, guestName: "" }],
  ["a name of spaces only", { ...request, guestName: "   " }],
  ["a name longer than 100 characters", { ...request, guestName: "a".repeat(101) }],
  ["a name that is a number", { ...request, guestName: 42 }],
  ["a name that is a boolean", { ...request, guestName: true }],
  ["no email", withoutEmail],
  ["an email without a domain", { ...request, guestEmail: "anna@" }],
  ["an email without @", { ...request, guestEmail: "anna" }],
  [
    "an email longer than 254 characters",
    { ...request, guestEmail: email("a".repeat(255 - email("").length)) },
  ],
])("%s is a data error", async (_, payload) => {
  const app = await appWithEventTypes();

  const response = await createBooking(app, "intro-60", payload);

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual(validationError);
});

test("the longest name and email are accepted", async () => {
  const app = await appWithEventTypes();
  const longest = {
    ...request,
    guestName: "a".repeat(100),
    guestEmail: email("a".repeat(254 - email("").length)),
  };

  const response = await createBooking(app, "intro-60", longest);

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    guestName: longest.guestName,
    guestEmail: longest.guestEmail,
  });
});

// The current moment is Wednesday, 12:00 in Moscow (09:00 UTC); one-hour calls.
test.each([
  ["a start off the 15-minute step", "2026-11-19T07:05:00.000Z"],
  ["a day after the booking window", "2026-12-02T07:00:00.000Z"],
  ["a Saturday", "2026-11-21T07:00:00.000Z"],
  ["a start before 09:00", "2026-11-19T05:45:00.000Z"],
  ["an end after 18:00", "2026-11-19T14:15:00.000Z"],
  ["a start at the current moment", "2026-11-18T09:00:00.000Z"],
  ["a start before the current moment", "2026-11-18T07:00:00.000Z"],
])("%s is unavailable time", async (_, start) => {
  const app = await appWithEventTypes();

  const response = await createBooking(app, "intro-60", { ...request, start });

  expect(response.statusCode).toBe(422);
  expect(response.json()).toEqual(unavailableError);
});

test("a data error comes before an unknown event type", async () => {
  const app = await appWithEventTypes();

  const response = await createBooking(app, "missing", { ...request, guestName: "" });

  expect(response.json()).toEqual(validationError);
});

test("an unknown event type comes before unavailable time", async () => {
  const app = await appWithEventTypes();

  const response = await createBooking(app, "missing", {
    ...request,
    start: "2026-11-19T07:05:00.000Z",
  });

  expect(response.json()).toEqual(notFoundError);
});

test("unavailable time comes before a conflict", async () => {
  const app = await appWithEventTypes();
  await createBooking(app, "intro-60", request);

  // 10:05 is off the step and overlaps the 10:00 booking.
  const response = await createBooking(app, "review-90", {
    ...request,
    start: "2026-11-19T07:05:00.000Z",
  });

  expect(response.json()).toEqual(unavailableError);
});

test("of two simultaneous requests for overlapping time, the second is a conflict", async () => {
  const app = await appWithEventTypes();

  const responses = await Promise.all([
    createBooking(app, "intro-60", request),
    createBooking(app, "review-90", { ...request, start: "2026-11-19T07:30:00.000Z" }),
  ]);

  expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
  expect(responses.find((response) => response.statusCode === 409)?.json()).toEqual(conflictError);
});

test("bookings right before and right after another one are allowed", async () => {
  const app = await appWithEventTypes();
  // 10:00–11:00 in Moscow.
  await createBooking(app, "intro-60", request);

  // 09:00–10:00 and 11:00–12:30 in Moscow.
  const before = await createBooking(app, "intro-60", {
    ...request,
    start: "2026-11-19T06:00:00.000Z",
  });
  const after = await createBooking(app, "review-90", {
    ...request,
    start: "2026-11-19T08:00:00.000Z",
  });

  expect([before.statusCode, after.statusCode]).toEqual([201, 201]);
});

test("a booking of another event type over the same time is a conflict", async () => {
  const app = await appWithEventTypes();
  // Thursday, 10:00–11:30 in Moscow.
  await createBooking(app, "review-90", { start: "2026-11-19T07:00:00.000Z", ...guest });

  // Thursday, 11:00–12:00 in Moscow, overlapping the review's last half hour.
  const response = await createBooking(app, "intro-60", {
    start: "2026-11-19T08:00:00.000Z",
    guestName: "Борис",
    guestEmail: email("boris"),
  });

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual(conflictError);
});

test("a shorter booking inside a longer one of another event type is a conflict", async () => {
  const app = await appWithEventTypes();
  await app.inject({
    method: "POST",
    url: "/api/event-types",
    payload: { id: "quick-30", title: "Короткий созвон", durationMinutes: 30 },
  });
  // Thursday, 10:00–11:00 in Moscow.
  await createBooking(app, "intro-60", { start: "2026-11-19T07:00:00.000Z", ...guest });

  // Thursday, 10:30–11:00 in Moscow, inside the intro call's second half hour.
  const response = await createBooking(app, "quick-30", {
    start: "2026-11-19T07:30:00.000Z",
    guestName: "Борис",
    guestEmail: email("boris"),
  });

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual(conflictError);
});

async function thursdayFreeSlotStarts(app: App, eventTypeId: string) {
  const response = await app.inject({
    method: "GET",
    url: `/api/event-types/${eventTypeId}/slots`,
  });
  const days = response.json<BookingWindowDay[]>();
  return days[1].slots.filter(({ free }) => free).map(({ start }) => start);
}

// 33 one-hour slots start on Thursday, 09:00–17:00 in Moscow. A booking from 10:00 takes those
// starting after 09:00 and before its end; 09:00 ends right at its start and stays.
test.each([
  ["the same event type", "intro-60", "08:00", 33 - 7],
  ["another event type", "review-90", "08:30", 33 - 9],
])(
  "slots overlapping a booking of %s stay in the list but are not free",
  async (_, bookedEventTypeId, nextFreeStart, count) => {
    const app = await appWithEventTypes();
    await createBooking(app, bookedEventTypeId, { start: "2026-11-19T07:00:00.000Z", ...guest });

    const starts = await thursdayFreeSlotStarts(app, "intro-60");

    expect(starts.slice(0, 2)).toEqual([
      "2026-11-19T06:00:00.000Z",
      `2026-11-19T${nextFreeStart}:00.000Z`,
    ]);
    expect(starts).toHaveLength(count);
    // The busy slots are still listed: Thursday keeps all 33.
    const response = await app.inject({ method: "GET", url: "/api/event-types/intro-60/slots" });
    expect(response.json<BookingWindowDay[]>()[1].slots).toHaveLength(33);
  },
);
