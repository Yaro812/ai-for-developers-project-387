import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../App.tsx";
import { stubServer } from "../test-server.ts";

function renderBookingPage(id: string) {
  window.history.pushState({}, "", `/book/${id}`);
  render(<App />);
}

const reviewCall = {
  id: "review-90",
  title: "Ревью проекта",
  description: "Разберём код\nи план",
  durationMinutes: 90,
};

const noSlots = (date: string) => ({ date, slots: [] });

// Friday's slots are over and the weekend has none, so Monday is the first day with free slots.
// The window lies in two months, and the six weeks of November show all of it.
const bookingWindow = [
  noSlots("2026-11-20"),
  noSlots("2026-11-21"),
  noSlots("2026-11-22"),
  {
    date: "2026-11-23",
    slots: [
      { start: "2026-11-23T06:00:00.000Z", end: "2026-11-23T07:30:00.000Z", free: true },
      { start: "2026-11-23T06:15:00.000Z", end: "2026-11-23T07:45:00.000Z", free: true },
      // Overlaps a booking of another event type.
      { start: "2026-11-23T10:00:00.000Z", end: "2026-11-23T11:30:00.000Z", free: false },
      { start: "2026-11-23T13:30:00.000Z", end: "2026-11-23T15:00:00.000Z", free: true },
    ],
  },
  {
    date: "2026-11-24",
    slots: [{ start: "2026-11-24T11:00:00.000Z", end: "2026-11-24T12:30:00.000Z", free: true }],
  },
  ...[
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
    "2026-11-28",
    "2026-11-29",
    "2026-11-30",
    "2026-12-01",
    "2026-12-02",
    "2026-12-03",
  ].map(noSlots),
];

const eventTypeRoute = "GET /api/event-types/review-90";
const slotsRoute = "GET /api/event-types/review-90/slots";

// Answers both requests of the page; `routes` replaces either answer.
function stubBookingPage(routes: Parameters<typeof stubServer>[0] = {}) {
  return stubServer({
    [eventTypeRoute]: () => Response.json(reviewCall),
    [slotsRoute]: () => Response.json(bookingWindow),
    ...routes,
  });
}

// The layout's header has its own links, so the tests look inside the page.
const page = () => within(screen.getByRole("main"));
// Day buttons are named by weekday, date and free slots, like «пт, 20 нояб., свободно: 0».
const dayButtons = () => page().getAllByRole("button", { name: /нояб\.|дек\./ });
const dayName = (day: string) => new RegExp(`^${day}, свободно`);
const dayButton = (day: string) => page().getByRole("button", { name: dayName(day) });
const findSelectedDay = (day: string) =>
  screen.findByRole("button", { name: dayName(day), pressed: true });
const label = (button: HTMLElement) => button.getAttribute("aria-label");
const pressed = (button: HTMLElement) => button.getAttribute("aria-pressed");
const disabled = (button: HTMLElement) => (button as HTMLButtonElement).disabled;
// Slot buttons are named by the interval and the status, like «09:00–10:30 Свободно».
const slotButtons = () => page().queryAllByRole("button", { name: /^\d\d:\d\d–\d\d:\d\d/ });
const slotButton = (start: string) =>
  page().getByRole("button", { name: new RegExp(`^${start}–`) });
const findSlotButton = (start: string) =>
  screen.findByRole("button", { name: new RegExp(`^${start}–`) });
const continueButton = () => page().getByRole("button", { name: "Продолжить" });
// The value of a row of the «Информация» card.
const fact = (name: string) => page().getByText(name).nextElementSibling?.textContent;

test("the calendar shows the 14 days of the window with the first day with free slots selected", async () => {
  stubBookingPage();

  renderBookingPage("review-90");

  await findSelectedDay("пн, 23 нояб.");
  expect(page().getByText("ноябрь 2026 г.")).toBeTruthy();
  expect(dayButtons().map((button) => [label(button), pressed(button)])).toEqual([
    ["пт, 20 нояб., свободно: 0", "false"],
    ["сб, 21 нояб., свободно: 0", "false"],
    ["вс, 22 нояб., свободно: 0", "false"],
    ["пн, 23 нояб., свободно: 3", "true"],
    ["вт, 24 нояб., свободно: 1", "false"],
    ["ср, 25 нояб., свободно: 0", "false"],
    ["чт, 26 нояб., свободно: 0", "false"],
    ["пт, 27 нояб., свободно: 0", "false"],
    ["сб, 28 нояб., свободно: 0", "false"],
    ["вс, 29 нояб., свободно: 0", "false"],
    ["пн, 30 нояб., свободно: 0", "false"],
    ["вт, 1 дек., свободно: 0", "false"],
    ["ср, 2 дек., свободно: 0", "false"],
    ["чт, 3 дек., свободно: 0", "false"],
  ]);
  // A day with free slots shows their number under its date.
  expect(dayButton("пн, 23 нояб.").textContent).toBe("233 св.");
  expect(dayButton("пт, 20 нояб.").textContent).toBe("20");
});

test("the arrows turn the calendar between the months of the window", async () => {
  stubBookingPage();
  renderBookingPage("review-90");
  await findSelectedDay("пн, 23 нояб.");
  const previous = page().getByRole("button", { name: "Предыдущий месяц" });
  const next = page().getByRole("button", { name: "Следующий месяц" });

  expect([disabled(previous), disabled(next)]).toEqual([true, false]);

  fireEvent.click(next);

  expect(page().getByText("декабрь 2026 г.")).toBeTruthy();
  // December's weeks start with Monday, 30 November.
  expect(dayButtons().map(label)).toEqual([
    "пн, 30 нояб., свободно: 0",
    "вт, 1 дек., свободно: 0",
    "ср, 2 дек., свободно: 0",
    "чт, 3 дек., свободно: 0",
  ]);
  expect([disabled(previous), disabled(next)]).toEqual([false, true]);
});

test("days without free slots are disabled buttons", async () => {
  stubBookingPage();

  renderBookingPage("review-90");

  await findSelectedDay("пн, 23 нояб.");
  expect(
    dayButtons()
      .filter((button) => !disabled(button))
      .map(label),
  ).toEqual(["пн, 23 нояб., свободно: 3", "вт, 24 нояб., свободно: 1"]);
});

test("with no free slots in all 14 days the page says so and «Назад» leads to the catalog", async () => {
  stubBookingPage({
    [slotsRoute]: () => Response.json(bookingWindow.map(({ date }) => noSlots(date))),
  });

  renderBookingPage("review-90");

  expect(await screen.findByText("В ближайшие 14 дней свободного времени нет")).toBeTruthy();
  expect(page().getByRole("link", { name: "Назад" }).getAttribute("href")).toBe("/book");
  expect(dayButtons().map((button) => [disabled(button), pressed(button)])).toEqual(
    Array(14).fill([true, "false"]),
  );
  expect(slotButtons()).toEqual([]);
  expect(disabled(continueButton())).toBe(true);
  expect([fact("Выбранная дата"), fact("Свободных слотов")]).toEqual(["Дата не выбрана", "0"]);
});

test("the selected day's slots show their interval in Moscow time and whether they are free", async () => {
  stubBookingPage();

  renderBookingPage("review-90");

  await findSelectedDay("пн, 23 нояб.");
  expect(page().getByText("Московское время (UTC+3)")).toBeTruthy();
  expect(
    slotButtons().map((button) => [button.textContent, disabled(button), pressed(button)]),
  ).toEqual([
    ["09:00–10:30Свободно", false, "false"],
    ["09:15–10:45Свободно", false, "false"],
    ["13:00–14:30Занято", true, "false"],
    ["16:30–18:00Свободно", false, "false"],
  ]);
  expect([fact("Выбранная дата"), fact("Выбранное время"), fact("Свободных слотов")]).toEqual([
    "понедельник, 23 ноября",
    "Время не выбрано",
    "3",
  ]);
});

test("a clicked slot is selected, and another day resets it, all outside the URL", async () => {
  stubBookingPage();
  renderBookingPage("review-90");

  fireEvent.click(await findSlotButton("09:15"));

  expect(slotButtons().map(pressed)).toEqual(["false", "true", "false", "false"]);
  expect(fact("Выбранное время")).toBe("09:15–10:45");

  fireEvent.click(dayButton("вт, 24 нояб."));

  expect(pressed(dayButton("вт, 24 нояб."))).toBe("true");
  expect(pressed(dayButton("пн, 23 нояб."))).toBe("false");
  expect(slotButtons().map((button) => [button.textContent, pressed(button)])).toEqual([
    ["14:00–15:30Свободно", "false"],
  ]);
  expect([fact("Выбранная дата"), fact("Выбранное время")]).toEqual([
    "вторник, 24 ноября",
    "Время не выбрано",
  ]);

  fireEvent.click(dayButton("пн, 23 нояб."));

  expect(slotButtons().map(pressed)).toEqual(["false", "false", "false", "false"]);
  expect(window.location.pathname + window.location.search + window.location.hash).toBe(
    "/book/review-90",
  );
});

test("the page shows the event type title, duration and description with its line breaks", async () => {
  stubBookingPage();

  renderBookingPage("review-90");

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(document.title).toBe("Ревью проекта");
  expect(fact("Длительность")).toBe("90 мин.");
  const description = screen.getByText(
    (_, element) => element?.textContent === "Разберём код\nи план",
  );
  expect(getComputedStyle(description).whiteSpace).toBe("pre-wrap");
  expect(page().getByRole("link", { name: "Назад" }).getAttribute("href")).toBe("/book");
});

const { description: _description, ...withoutDescription } = reviewCall;

test.each([
  ["no description", withoutDescription],
  ["an empty description", { ...reviewCall, description: "" }],
])("with %s the page shows no empty paragraph", async (_, eventType) => {
  stubBookingPage({ [eventTypeRoute]: () => Response.json(eventType) });

  renderBookingPage("review-90");

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(fact("Длительность")).toBe("90 мин.");
  expect(screen.getAllByRole("paragraph").map((paragraph) => paragraph.textContent)).not.toContain(
    "",
  );
});

test("the page requests the event type and its slots at once and shows only a loading indicator until both answer", async () => {
  let answerEventType = (_response: Response) => {};
  let answerSlots = (_response: Response) => {};
  const fetch = stubBookingPage({
    [eventTypeRoute]: () => new Promise((resolve) => (answerEventType = resolve)),
    [slotsRoute]: () => new Promise((resolve) => (answerSlots = resolve)),
  });

  renderBookingPage("review-90");

  // Both requests are out while neither has an answer.
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("progressbar", { name: "Загрузка" })).toBeTruthy();

  answerEventType(Response.json(reviewCall));
  // Nothing on the page signals that the first answer arrived, so the test gives it time to render.
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(screen.getByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
  expect(page().queryByRole("heading")).toBeNull();
  expect(page().queryByRole("link")).toBeNull();
  expect(page().queryByRole("button")).toBeNull();

  answerSlots(Response.json(bookingWindow));

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(dayButtons()).toHaveLength(14);
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("the guest opens the booking page from its catalog card", async () => {
  stubBookingPage({ "GET /api/event-types": () => Response.json([reviewCall]) });
  window.history.pushState({}, "", "/book");
  render(<App />);

  fireEvent.click(await screen.findByRole("link", { name: "Ревью проекта" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(window.location.pathname).toBe("/book/review-90");
  expect(document.title).toBe("Ревью проекта");
});

const networkError = () => Promise.reject(new TypeError("Failed to fetch"));
const serverError = () => Response.json({ message: "boom" }, { status: 500 });

test.each([
  ["a network error for the event type", eventTypeRoute, networkError],
  ["a server error for the event type", eventTypeRoute, serverError],
  ["a network error for the slots", slotsRoute, networkError],
  ["a server error for the slots", slotsRoute, serverError],
])("after %s the page asks to reload it and does not retry", async (_, route, answer) => {
  const fetch = stubBookingPage({ [route]: answer });

  renderBookingPage("review-90");

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByRole("heading")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("an unknown event type says it is not found and links to the catalog on the same URL", async () => {
  const notFound = () =>
    Response.json(
      {
        statusCode: 404,
        code: "EVENT_TYPE_NOT_FOUND",
        error: "Not Found",
        message: "Event type missing not found",
      },
      { status: 404 },
    );
  stubServer({
    "GET /api/event-types/missing": notFound,
    "GET /api/event-types/missing/slots": notFound,
  });

  renderBookingPage("missing");

  expect(
    await screen.findByRole("heading", { level: 1, name: "Тип встречи не найден" }),
  ).toBeTruthy();
  expect(document.title).toBe("Тип встречи не найден");
  expect(window.location.pathname).toBe("/book/missing");
  expect(screen.getByRole("link", { name: "К каталогу типов встреч" }).getAttribute("href")).toBe(
    "/book",
  );
  expect(page().queryByRole("button")).toBeNull();
});

// With `description`, finds the field only while that message stands under it.
const nameField = (description?: string) =>
  screen.getByRole("textbox", { name: "Имя", description }) as HTMLInputElement;
const emailField = (description?: string) =>
  screen.getByRole("textbox", { name: "Email", description }) as HTMLInputElement;
const bookButton = () => screen.queryByRole("button", { name: "Подтвердить бронирование" });
const follows = (first: Node, second: Node) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

test("«Продолжить» waits for a slot and then opens the form in place of the calendar and the slots", async () => {
  stubBookingPage();
  renderBookingPage("review-90");
  await findSelectedDay("пн, 23 нояб.");

  expect(disabled(continueButton())).toBe(true);
  expect(bookButton()).toBeNull();

  fireEvent.click(slotButton("09:15"));
  fireEvent.click(continueButton());

  expect([fact("Выбранная дата"), fact("Выбранное время")]).toEqual([
    "понедельник, 23 ноября",
    "09:15–10:45",
  ]);
  expect(nameField().value).toBe("");
  expect(emailField().value).toBe("");
  expect(follows(emailField(), bookButton()!)).toBe(true);
  expect(page().queryAllByRole("button", { name: /нояб\./ })).toEqual([]);
  expect(slotButtons()).toEqual([]);
});

// Fake guest addresses on the reserved example.com domain.
const email = (local: string) => `${local}@example.com`;

function fillGuest(name: string, address: string) {
  fireEvent.change(nameField(), { target: { value: name } });
  fireEvent.change(emailField(), { target: { value: address } });
}

test("«Изменить» returns to the choice, and the name and email return with the next slot", async () => {
  await openForm();
  fillGuest("Анна", email("anna"));

  fireEvent.click(page().getByRole("button", { name: "Изменить" }));

  expect(bookButton()).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  // The slot stays selected until the guest picks another day.
  expect(pressed(slotButton("09:15"))).toBe("true");

  fireEvent.click(dayButton("вт, 24 нояб."));
  fireEvent.click(slotButton("14:00"));
  fireEvent.click(continueButton());

  expect([fact("Выбранная дата"), fact("Выбранное время")]).toEqual([
    "вторник, 24 ноября",
    "14:00–15:30",
  ]);
  expect([nameField().value, emailField().value]).toEqual(["Анна", email("anna")]);
});

async function openForm(routes: Parameters<typeof stubServer>[0] = {}) {
  const fetch = stubBookingPage(routes);
  renderBookingPage("review-90");
  fireEvent.click(await findSlotButton("09:15"));
  fireEvent.click(continueButton());
  return fetch;
}

const bookingRoute = "POST /api/event-types/review-90/bookings";
const bookRequests = (fetch: ReturnType<typeof stubServer>) =>
  fetch.mock.calls.filter(([request]) => request.method === "POST");

test.each([
  ["an empty name", "", email("anna"), "name", "Укажите имя"],
  ["a name of spaces only", "   ", email("anna"), "name", "Укажите имя"],
  ["an email without @", "Анна", "anna", "email", "Неверный формат email"],
  ["an email without a domain", "Анна", "anna@", "email", "Неверный формат email"],
  ["an email with a space inside", "Анна", email("an na"), "email", "Неверный формат email"],
] as const)(
  "%s shows a message under its field and sends nothing",
  async (_, name, address, key, message) => {
    const fetch = await openForm();

    fillGuest(name, address);
    fireEvent.click(bookButton()!);

    expect((key === "name" ? nameField : emailField)(message)).toBeTruthy();
    expect(bookRequests(fetch)).toEqual([]);
  },
);

// The server's answer for the selected Monday 09:15 slot.
const booking = {
  eventType: reviewCall,
  start: "2026-11-23T06:15:00.000Z",
  end: "2026-11-23T07:45:00.000Z",
  guestName: "Анна",
  guestEmail: email("anna"),
  createdAt: "2026-11-20T15:00:00.000Z",
};
const booked = () => Response.json(booking, { status: 201 });

const confirmationName = "Бронирование подтверждено. До встречи!";
const [friday, saturday, sunday, monday, tuesday, ...rest] = bookingWindow;
// Monday once its 09:15 slot is booked: the slot stays in the list, no longer free.
const windowWithoutMonday0915 = [
  friday,
  saturday,
  sunday,
  {
    ...monday,
    slots: monday.slots.map((slot) =>
      slot.start === "2026-11-23T06:15:00.000Z" ? { ...slot, free: false } : slot,
    ),
  },
  tuesday,
  ...rest,
];

test("a booking sends the trimmed values, and its confirmation replaces the form", async () => {
  let sent: unknown;
  let slotsCalls = 0;
  await openForm({
    [slotsRoute]: () => Response.json(++slotsCalls === 1 ? bookingWindow : windowWithoutMonday0915),
    [bookingRoute]: async (request) => {
      sent = await request.json();
      return booked();
    },
  });

  fillGuest("  Анна ", ` ${email("anna")}  `);
  fireEvent.click(bookButton()!);

  const confirmation = await screen.findByRole("region", { name: confirmationName });
  expect(sent).toEqual({
    start: "2026-11-23T06:15:00.000Z",
    guestName: "Анна",
    guestEmail: email("anna"),
  });
  expect(within(confirmation).getByRole("heading", { name: confirmationName })).toBeTruthy();
  expect(within(confirmation).getByText("Анна")).toBeTruthy();
  expect(within(confirmation).getByText(email("anna"))).toBeTruthy();
  // The title and the information stay; the form is gone.
  expect(screen.getByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect([fact("Выбранная дата"), fact("Выбранное время")]).toEqual([
    "понедельник, 23 ноября",
    "09:15–10:45",
  ]);
  expect(screen.queryAllByRole("textbox")).toEqual([]);
  // The slots are loaded again, and the booked one is no longer free.
  await waitFor(() => expect(fact("Свободных слотов")).toBe("2"));

  fireEvent.click(within(confirmation).getByRole("button", { name: "Забронировать ещё" }));

  expect(screen.queryByRole("region", { name: confirmationName })).toBeNull();
  expect(pressed(dayButton("пн, 23 нояб."))).toBe("true");
  expect(slotButtons().map((button) => [button.textContent, pressed(button)])).toEqual([
    ["09:00–10:30Свободно", "false"],
    ["09:15–10:45Занято", "false"],
    ["13:00–14:30Занято", "false"],
    ["16:30–18:00Свободно", "false"],
  ]);
  expect(fact("Выбранное время")).toBe("Время не выбрано");
});

test("the book button is disabled while the request runs", async () => {
  let answer = (_response: Response) => {};
  const fetch = await openForm({
    [bookingRoute]: () => new Promise((resolve) => (answer = resolve)),
  });

  fillGuest("Анна", email("anna"));
  fireEvent.click(bookButton()!);
  await waitFor(() => expect(bookRequests(fetch)).toHaveLength(1));

  expect((bookButton() as HTMLButtonElement).disabled).toBe(true);

  answer(booked());

  expect(await screen.findByRole("region", { name: confirmationName })).toBeTruthy();
});

const apiError = (statusCode: number, code: string, error: string) => () =>
  Response.json({ statusCode, code, error, message: "Refused" }, { status: statusCode });
const conflict = apiError(409, "BOOKING_CONFLICT", "Conflict");
const unavailable = apiError(422, "TIME_UNAVAILABLE", "Unprocessable Entity");

// The first slots request answers at once; the reload after a refusal waits for `answerReload`.
function slotsThenReload() {
  let answerReload = (_window: unknown) => {};
  let calls = 0;
  const route = () => {
    calls += 1;
    if (calls === 1) return Response.json(bookingWindow);
    return new Promise<Response>((resolve) => {
      answerReload = (window) => resolve(Response.json(window));
    });
  };
  return { route, reload: (window: unknown) => answerReload(window), calls: () => calls };
}

test.each([
  ["a booking conflict", conflict, "Это время уже занято, выберите другой слот"],
  ["unavailable time", unavailable, "Это время больше недоступно, выберите другой слот"],
])(
  "after %s the page says so above the calendar, reloads the slots and keeps the day and the input",
  async (_, refusal, message) => {
    const slots = slotsThenReload();
    await openForm({ [slotsRoute]: slots.route, [bookingRoute]: refusal });
    fillGuest("Анна", email("anna"));

    fireEvent.click(bookButton()!);

    const notice = await screen.findByText(message);
    // The slots are reloading: an indicator stands in place of the days and slots, the header stays.
    expect(screen.getByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
    expect(page().queryAllByRole("button")).toEqual([]);
    expect(screen.getByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
    expect(slots.calls()).toBe(2);

    slots.reload(windowWithoutMonday0915);

    await findSelectedDay("пн, 23 нояб.");
    expect(follows(notice, dayButtons()[0])).toBe(true);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(slotButtons().map((button) => [button.textContent, pressed(button)])).toEqual([
      ["09:00–10:30Свободно", "false"],
      ["09:15–10:45Занято", "false"],
      ["13:00–14:30Занято", "false"],
      ["16:30–18:00Свободно", "false"],
    ]);
    expect(bookButton()).toBeNull();

    fireEvent.click(slotButton("09:00"));

    expect(screen.queryByText(message)).toBeNull();

    fireEvent.click(continueButton());

    expect([nameField().value, emailField().value]).toEqual(["Анна", email("anna")]);
  },
);

// The guest picked Tuesday, not the default Monday, before the refusal.
test.each([
  [
    "a day with free slots left stays selected",
    [{ start: "2026-11-24T12:00:00.000Z", end: "2026-11-24T13:30:00.000Z", free: true }],
    "вт, 24 нояб.",
  ],
  [
    "a day left without free slots gives way to the first day with them",
    [{ start: "2026-11-24T11:00:00.000Z", end: "2026-11-24T12:30:00.000Z", free: false }],
    "пн, 23 нояб.",
  ],
])("after a refusal %s", async (_, tuesdaySlots, selectedDay) => {
  const slots = slotsThenReload();
  stubBookingPage({ [slotsRoute]: slots.route, [bookingRoute]: conflict });
  renderBookingPage("review-90");
  fireEvent.click(await screen.findByRole("button", { name: dayName("вт, 24 нояб.") }));
  fireEvent.click(slotButton("14:00"));
  fireEvent.click(continueButton());
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);
  await screen.findByText("Это время уже занято, выберите другой слот");
  slots.reload([friday, saturday, sunday, monday, { ...tuesday, slots: tuesdaySlots }, ...rest]);

  await findSelectedDay(selectedDay);
  expect(page().getAllByRole("button", { pressed: true })).toHaveLength(1);
});

test("after a refusal with no free slots left the page says there is no free time", async () => {
  const slots = slotsThenReload();
  await openForm({ [slotsRoute]: slots.route, [bookingRoute]: conflict });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);
  await screen.findByText("Это время уже занято, выберите другой слот");
  slots.reload(bookingWindow.map(({ date }) => noSlots(date)));

  expect(await screen.findByText("В ближайшие 14 дней свободного времени нет")).toBeTruthy();
  expect(slotButtons()).toEqual([]);
  expect(bookButton()).toBeNull();
});

test("after a refusal a failed reload of the slots asks to reload the page", async () => {
  let calls = 0;
  await openForm({
    [slotsRoute]: () => (++calls === 1 ? Response.json(bookingWindow) : serverError()),
    [bookingRoute]: conflict,
  });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("a data error found by the server is reported and the values stay", async () => {
  await openForm({ [bookingRoute]: apiError(400, "FST_ERR_VALIDATION", "Bad Request") });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);

  expect(
    await screen.findByText("Не удалось сохранить бронирование, проверьте данные"),
  ).toBeTruthy();
  expect(fact("Выбранное время")).toBe("09:15–10:45");
  expect([nameField().value, emailField().value]).toEqual(["Анна", email("anna")]);
});

test("an event type gone while booking says it no longer exists and links to the catalog, without the header", async () => {
  await openForm({ [bookingRoute]: apiError(404, "EVENT_TYPE_NOT_FOUND", "Not Found") });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Этот тип встречи больше не существует",
    }),
  ).toBeTruthy();
  expect(document.title).toBe("Этот тип встречи больше не существует");
  expect(screen.getByRole("link", { name: "К каталогу типов встреч" }).getAttribute("href")).toBe(
    "/book",
  );
  expect(screen.queryByText("Ревью проекта")).toBeNull();
  expect(screen.queryByText("90 мин.")).toBeNull();
  expect(page().queryAllByRole("button")).toEqual([]);
  expect(screen.queryAllByRole("textbox")).toEqual([]);
});
