import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../App.tsx";
import { stubServer } from "../test-server.ts";

function renderPage() {
  window.history.pushState({}, "", "/owner/bookings");
  render(<App />);
}

// Fake guest addresses on the reserved example.com domain.
const email = (local: string) => `${local}@example.com`;

const bookings = [
  {
    eventType: { id: "intro-60", title: "Знакомство", durationMinutes: 60 },
    // Thursday, 10:00–11:00 in Moscow.
    start: "2026-11-19T07:00:00.000Z",
    end: "2026-11-19T08:00:00.000Z",
    guestName: "Анна",
    guestEmail: email("anna"),
    // Wednesday, 15:05 in Moscow.
    createdAt: "2026-11-18T12:05:00.000Z",
  },
  {
    eventType: { id: "review-90", title: "Ревью проекта", durationMinutes: 90 },
    // Friday, 17:00–18:30 in Moscow.
    start: "2026-11-20T14:00:00.000Z",
    end: "2026-11-20T15:30:00.000Z",
    guestName: "Борис",
    guestEmail: email("boris"),
    createdAt: "2026-11-18T21:30:00.000Z",
  },
];

// A booking is a card; each of its lines is a paragraph.
const lines = (card: HTMLElement) =>
  [...card.querySelectorAll("p")].map((line) => line.textContent);

test("the cards show every booking in the server's order, in the owner's time zone", async () => {
  stubServer({ "GET /api/bookings": () => Response.json(bookings) });

  renderPage();

  const cards = await screen.findAllByRole("article");
  expect(cards.map(lines)).toEqual([
    [
      "Анна",
      email("anna"),
      "Знакомство",
      "Слот: чт, 19 ноября, 10:00–11:00",
      "Создано: 18.11.2026, 15:05",
    ],
    [
      "Борис",
      email("boris"),
      "Ревью проекта",
      "Слот: пт, 20 ноября, 17:00–18:30",
      // 00:30 on Thursday in Moscow, still Wednesday in UTC.
      "Создано: 19.11.2026, 00:30",
    ],
  ]);
  expect(screen.getByText("Московское время (UTC+3)")).toBeTruthy();
});

test("with no bookings the page says there are none and shows no card", async () => {
  stubServer({ "GET /api/bookings": () => Response.json([]) });

  renderPage();

  expect(await screen.findByText("Предстоящих бронирований нет")).toBeTruthy();
  expect(screen.queryByRole("article")).toBeNull();
});

test("the page shows a loading indicator until the server answers", async () => {
  let answer = (_response: Response) => {};
  stubServer({ "GET /api/bookings": () => new Promise((resolve) => (answer = resolve)) });

  renderPage();

  expect(await screen.findByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
  expect(screen.queryByText("Предстоящих бронирований нет")).toBeNull();

  answer(Response.json(bookings));

  expect(await screen.findAllByRole("article")).toHaveLength(2);
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test.each([
  ["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ["a server error", () => Response.json({ message: "boom" }, { status: 500 })],
])("after %s the page asks to reload it and does not retry", async (_, answer) => {
  const fetch = stubServer({ "GET /api/bookings": answer });

  renderPage();

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText("Предстоящих бронирований нет")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
