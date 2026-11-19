import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App.tsx";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  render(<App />);
}

test("home page invites the guest to book a call", () => {
  renderAt("/");

  expect(screen.getByRole("heading", { level: 1, name: "Календарь звонков" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Записаться на звонок" }).getAttribute("href")).toBe(
    "/book",
  );
});

test("booking link opens the event type catalog", () => {
  renderAt("/");

  fireEvent.click(screen.getByRole("link", { name: "Записаться на звонок" }));

  expect(screen.getByRole("heading", { level: 1, name: "Каталог типов встреч" })).toBeTruthy();
  expect(window.location.pathname).toBe("/book");
  expect(document.title).toBe("Каталог типов встреч");
});

test("the header opens upcoming bookings from the home page", () => {
  renderAt("/");

  fireEvent.click(screen.getByRole("link", { name: "Предстоящие бронирования" }));

  expect(window.location.pathname).toBe("/owner/bookings");
  expect(screen.getByRole("heading", { level: 1, name: "Предстоящие бронирования" })).toBeTruthy();
  expect(document.title).toBe("Предстоящие бронирования");
});

test("the header links the owner pages to each other and marks the current one", () => {
  renderAt("/owner/bookings");

  fireEvent.click(screen.getByRole("link", { name: "Новый тип встречи" }));

  expect(window.location.pathname).toBe("/owner/event-types/new");
  expect(screen.getByRole("heading", { level: 1, name: "Новый тип встречи" })).toBeTruthy();
  expect(screen.getByRole("link", { current: "page" }).textContent).toBe("Новый тип встречи");

  fireEvent.click(screen.getByRole("link", { name: "Предстоящие бронирования" }));

  expect(window.location.pathname).toBe("/owner/bookings");
  expect(screen.getByRole("heading", { level: 1, name: "Предстоящие бронирования" })).toBeTruthy();
});

test("opening the catalog directly sets its title until the guest returns home", () => {
  renderAt("/book");

  expect(document.title).toBe("Каталог типов встреч");

  fireEvent.click(screen.getByRole("link", { name: "На главную" }));

  expect(window.location.pathname).toBe("/");
  expect(document.title).toBe("Календарь звонков");
});

test("the header's name leads home, and «Записаться» to the catalog", () => {
  renderAt("/owner/bookings");

  fireEvent.click(screen.getByRole("link", { name: "Записаться" }));

  expect(window.location.pathname).toBe("/book");

  fireEvent.click(screen.getByRole("link", { name: "Календарь звонков" }));

  expect(window.location.pathname).toBe("/");
  expect(screen.queryByRole("link", { current: "page" })).toBeNull();
});

test("an unknown address offers a link back to the home page", () => {
  renderAt("/bok");

  expect(screen.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeTruthy();
  expect(document.title).toBe("Страница не найдена");

  fireEvent.click(screen.getByRole("link", { name: "На главную" }));

  expect(window.location.pathname).toBe("/");
  expect(screen.getByRole("heading", { level: 1, name: "Календарь звонков" })).toBeTruthy();
});
