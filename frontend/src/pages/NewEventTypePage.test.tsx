import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../App.tsx";
import { stubServer } from "../test-server.ts";

function renderPage() {
  window.history.pushState({}, "", "/owner/event-types/new");
  render(<App />);
}

const fields = {
  id: ["textbox", "id"],
  title: ["textbox", "Название"],
  description: ["textbox", "Описание"],
  duration: ["spinbutton", "Длительность, мин."],
} as const;
type Field = keyof typeof fields;

// With `description`, finds the field only while that message stands under it.
function field(key: Field, description?: string) {
  const [role, name] = fields[key];
  return screen.getByRole(role, { name, description }) as HTMLInputElement;
}

function fill(values: Partial<Record<Field, string>>) {
  for (const [key, value] of Object.entries(values)) {
    fireEvent.change(field(key as Field), { target: { value } });
  }
}

const createButton = () => screen.getByRole("button", { name: "Создать" }) as HTMLButtonElement;

const introCall = {
  id: "intro-30",
  title: "Знакомство",
  description: "Обсудим задачу\nи сроки",
  duration: "45",
};

function valuesOnPage() {
  return {
    id: field("id").value,
    title: field("title").value,
    description: field("description").value,
    duration: field("duration").value,
  };
}

test("the page offers the event type fields", () => {
  renderPage();

  expect(screen.getByRole("heading", { level: 1, name: "Новый тип встречи" })).toBeTruthy();
  expect(document.title).toBe("Новый тип встречи");
  expect(field("id").placeholder).toBe("intro-30");
  expect(field("title")).toBeTruthy();
  expect(field("description").tagName).toBe("TEXTAREA");
  expect(field("duration").step).toBe("15");
  expect(field("duration").value).toBe("30");
});

test.each([
  [{ id: "Intro 30" }, "id", "Только строчная латиница, цифры и дефис"],
  [{ id: "" }, "id", "Только строчная латиница, цифры и дефис"],
  [{ title: "   " }, "title", "Укажите название"],
  [{ duration: "20" }, "duration", "От 15 до 540 минут, кратно 15"],
  [{ duration: "555" }, "duration", "От 15 до 540 минут, кратно 15"],
  [{ duration: "" }, "duration", "От 15 до 540 минут, кратно 15"],
] as const)("%o shows a message under the %s field and sends nothing", (wrong, name, message) => {
  const fetch = stubServer({});
  renderPage();

  fill({ ...introCall, ...wrong });
  fireEvent.click(createButton());

  expect(field(name, message)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});

test("a taken id is shown under the id field and the values stay", async () => {
  stubServer({
    "POST /api/event-types": () =>
      Response.json(
        {
          statusCode: 409,
          code: "EVENT_TYPE_ID_TAKEN",
          error: "Conflict",
          message: "Event type id intro-30 is already taken",
        },
        { status: 409 },
      ),
  });
  renderPage();

  fill(introCall);
  fireEvent.click(createButton());

  await screen.findByText("Такой id уже занят");
  expect(field("id", "Такой id уже занят")).toBeTruthy();
  expect(valuesOnPage()).toEqual(introCall);
});

test("a data error found by the server is reported and the values stay", async () => {
  stubServer({
    "POST /api/event-types": () =>
      Response.json(
        {
          statusCode: 400,
          code: "FST_ERR_VALIDATION",
          error: "Bad Request",
          message: "body/title must NOT have more than 100 characters",
        },
        { status: 400 },
      ),
  });
  renderPage();

  fill(introCall);
  fireEvent.click(createButton());

  expect(await screen.findByText("Не удалось создать тип встречи, проверьте данные")).toBeTruthy();
  expect(valuesOnPage()).toEqual(introCall);
});

test("the create button is disabled while the request runs", async () => {
  let answer = (_response: Response) => {};
  const fetch = stubServer({
    "POST /api/event-types": () => new Promise((resolve) => (answer = resolve)),
  });
  renderPage();

  fill(introCall);
  fireEvent.click(createButton());
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

  expect(createButton().disabled).toBe(true);

  answer(
    Response.json({ id: "intro-30", title: "Знакомство", durationMinutes: 45 }, { status: 201 }),
  );

  expect(await screen.findByText("Тип встречи создан")).toBeTruthy();
  expect(createButton().disabled).toBe(false);
});

test("a created event type links to its booking page above a cleared form", async () => {
  let sent: unknown;
  stubServer({
    "POST /api/event-types": async (request) => {
      sent = await request.json();
      return Response.json(sent, { status: 201 });
    },
  });
  renderPage();

  fill({ ...introCall, description: "" });
  fireEvent.click(createButton());

  expect(await screen.findByText("Тип встречи создан")).toBeTruthy();
  expect(sent).toStrictEqual({ id: "intro-30", title: "Знакомство", durationMinutes: 45 });
  const link = screen.getByRole("link", { name: `${window.location.origin}/book/intro-30` });
  expect(link.getAttribute("href")).toBe("/book/intro-30");
  expect(link.compareDocumentPosition(field("id")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(valuesOnPage()).toEqual({ id: "", title: "", description: "", duration: "30" });
});

test("a description is sent as written", async () => {
  let sent: unknown;
  stubServer({
    "POST /api/event-types": async (request) => {
      sent = await request.json();
      return Response.json(sent, { status: 201 });
    },
  });
  renderPage();

  fill(introCall);
  fireEvent.click(createButton());

  expect(await screen.findByText("Тип встречи создан")).toBeTruthy();
  expect(sent).toStrictEqual({
    id: "intro-30",
    title: "Знакомство",
    description: "Обсудим задачу\nи сроки",
    durationMinutes: 45,
  });
});
