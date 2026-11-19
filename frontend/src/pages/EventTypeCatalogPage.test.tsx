import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../App.tsx";
import { stubServer } from "../test-server.ts";

function renderCatalog() {
  window.history.pushState({}, "", "/book");
  render(<App />);
}

test("catalog shows event type cards in the order the server sent them", async () => {
  stubServer({
    "GET /api/event-types": () =>
      Response.json([
        {
          id: "intro-30",
          title: "Знакомство",
          description: "Обсудим задачу",
          durationMinutes: 30,
        },
        { id: "review-90", title: "Ревью проекта", durationMinutes: 90 },
      ]),
  });

  renderCatalog();

  const titles = await screen.findAllByRole("heading", { level: 2 });
  expect(titles.map((title) => title.textContent)).toEqual(["Знакомство", "Ревью проекта"]);
  expect(screen.getByRole("link", { name: "Знакомство" }).getAttribute("href")).toBe(
    "/book/intro-30",
  );
  expect(screen.getByRole("link", { name: "Ревью проекта" }).getAttribute("href")).toBe(
    "/book/review-90",
  );
  expect(screen.getByText("30 мин.")).toBeTruthy();
  expect(screen.getByText("90 мин.")).toBeTruthy();
  expect(screen.getByText("Обсудим задачу")).toBeTruthy();
});

test("an empty catalog says there are no event types yet", async () => {
  stubServer({ "GET /api/event-types": () => Response.json([]) });

  renderCatalog();

  expect(await screen.findByText("Типов встреч пока нет")).toBeTruthy();
  expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
});

test("catalog shows a loading indicator until the server answers", async () => {
  let answer = (_response: Response) => {};
  stubServer({ "GET /api/event-types": () => new Promise((resolve) => (answer = resolve)) });

  renderCatalog();

  expect(await screen.findByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
  expect(screen.queryByText("Типов встреч пока нет")).toBeNull();

  answer(Response.json([]));

  expect(await screen.findByText("Типов встреч пока нет")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test.each([
  ["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ["a server error", () => Response.json({ message: "boom" }, { status: 500 })],
])("after %s the catalog asks to reload the page and does not retry", async (_, answer) => {
  const fetch = stubServer({ "GET /api/event-types": answer });

  renderCatalog();

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText("Типов встреч пока нет")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
