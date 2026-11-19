import "@typespec/http";
import "@typespec/json-schema";

using Http;
using TypeSpec.JsonSchema;

/** Call booking API. Operations are named in camelCase, so each `operationId` equals the operation name. */
@service(#{ title: "Календарь звонков" })
namespace Calendar;

/**
 * Error body in Fastify's format; clients tell errors apart by `code`.
 * A concrete error extends it with `@statusCode` and a literal `code`.
 */
@error
model ApiError {
  statusCode: int32;
  code: string;
  error: string;
  message: string;
}

/** No route matches a path under `/api/`. No operation returns it, so the server answers it from its not-found handler. */
model RouteNotFoundError extends ApiError {
  @statusCode statusCode: 404;
  code: "ROUTE_NOT_FOUND";
}

/** The request breaks the contract schema; Fastify's request validation answers it. */
model ValidationError extends ApiError {
  @statusCode statusCode: 400;
  code: "FST_ERR_VALIDATION";
}

/** Another event type already has this id. */
model EventTypeIdTakenError extends ApiError {
  @statusCode statusCode: 409;
  code: "EVENT_TYPE_ID_TAKEN";
}

/** No event type has this id. */
model EventTypeNotFoundError extends ApiError {
  @statusCode statusCode: 404;
  code: "EVENT_TYPE_NOT_FOUND";
}

model Health {
  status: "ok";
}

/** A kind of call the owner offers. */
model EventType {
  /** Part of the booking page address, e.g. `intro-30`. */
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  @maxLength(50)
  id: string;

  /** At least one non-whitespace character. */
  @minLength(1)
  @maxLength(100)
  @pattern("\\S")
  title: string;

  /** Plain text; absent when the owner gave none. */
  @maxLength(500)
  description?: string;

  @minValue(15)
  @maxValue(540)
  @multipleOf(15)
  durationMinutes: int32;
}

/** An interval a booking may take; the server answers its moments in UTC, e.g. `2026-11-19T06:00:00.000Z`. */
model Slot {
  start: utcDateTime;
  end: utcDateTime;

  /** False when the slot overlaps a booking of any event type. */
  free: boolean;
}

/** A day of the booking window. */
model BookingWindowDay {
  /** The day in the owner's time zone, `Europe/Moscow`. */
  date: plainDate;

  /** Every slot in ascending order, free or not; empty on weekends or a past today. */
  slots: Slot[];
}

@route("/api/health")
@get
op getHealth(): Health;

/** All event types in creation order. */
@route("/api/event-types")
@get
op listEventTypes(): EventType[];

/** Checks the data first, then whether the id is taken. */
@route("/api/event-types")
@post
op createEventType(@body eventType: EventType): {
  @statusCode statusCode: 201;
  @body eventType: EventType;
} | ValidationError | EventTypeIdTakenError;

/** The path `id` has no `pattern` or `maxLength`, so any unknown id gets 404, never 400. */
@route("/api/event-types/{id}")
@get
op getEventType(@path id: string): EventType | EventTypeNotFoundError;

/** Exactly 14 days of the booking window in ascending order, starting with today by the server clock in the owner's time zone. */
@route("/api/event-types/{id}/slots")
@get
op listSlots(@path id: string): BookingWindowDay[] | EventTypeNotFoundError;

/** The interval overlaps a booking of any event type. */
model BookingConflictError extends ApiError {
  @statusCode statusCode: 409;
  code: "BOOKING_CONFLICT";
}

/** The interval is not a slot: off the slot step, outside the booking window or working hours, or not after the current moment. */
model UnavailableTimeError extends ApiError {
  @statusCode statusCode: 422;
  code: "TIME_UNAVAILABLE";
}

/** What the guest sends to book a slot; the event type comes in the path. */
model BookingRequest {
  /** Any offset is accepted: the server compares moments, not strings. */
  start: utcDateTime;

  /** At least one non-whitespace character; the server keeps it as received. */
  @minLength(1)
  @maxLength(100)
  @pattern("\\S")
  guestName: string;

  @format("email")
  @maxLength(254)
  guestEmail: string;
}

/** A booked interval. It has no id: bookings never overlap, so `start` is unique. */
model Booking {
  /** The whole event type: event types never change. */
  eventType: EventType;

  start: utcDateTime;

  /** The start plus the event type's duration. */
  end: utcDateTime;

  guestName: string;
  guestEmail: string;

  /** The server's current moment when it saved the booking. */
  createdAt: utcDateTime;
}

/** Checks the data, then the event type, then whether the interval is a slot, then whether it overlaps a booking of any event type. */
@route("/api/event-types/{id}/bookings")
@post
op createBooking(@path id: string, @body booking: BookingRequest): {
  @statusCode statusCode: 201;
  @body booking: Booking;
} | ValidationError | EventTypeNotFoundError | BookingConflictError | UnavailableTimeError;

/** Bookings of every event type that end after the current moment, by start in ascending order. */
@route("/api/bookings")
@get
op listUpcomingBookings(): Booking[];
