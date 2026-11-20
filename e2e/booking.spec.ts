import { expect, test, type Page } from "@playwright/test";

// Fake guest addresses on the reserved example.com domain.
const email = (local: string) => `${local}@example.com`;
const guestEmail = email("anna");
const guestEmailWithoutTopic = email("boris");
const topic = "Обсуждение договора";

async function createEventType(page: Page, { id, title }: { id: string; title: string }) {
  await page.goto("/owner/event-types/new");
  await page.getByRole("textbox", { name: "id", exact: true }).fill(id);
  await page.getByRole("textbox", { name: "Название" }).fill(title);
  await page.getByRole("spinbutton", { name: "Длительность, мин." }).fill("30");
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page.getByRole("link", { name: new RegExp(`/book/${id}$`) })).toBeVisible();
}

// Day buttons read «чт, 19 нояб., свободно: 35», slot buttons «10:00–10:30 Свободно».
// The guest's day must keep a free slot after the booking, or the page moves to another day.
// Booking the first of three free slots takes two at most, and the last hour of a working day
// leaves fewer; if that day is the only one of its month, the next month has a roomy day.
async function openRoomyDay(page: Page) {
  await expect(page.getByRole("button", { name: /^\S+, \d+ \S+, свободно/ }).first()).toBeVisible();
  const roomyDay = page
    .getByRole("button", { name: /^\S+, \d+ \S+, свободно: ([3-9]|\d{2,})$/ })
    .first();
  if ((await roomyDay.count()) === 0) {
    await page.getByRole("button", { name: "Следующий месяц" }).click();
  }
  await roomyDay.click();
}

// The path from README on real clocks: the server starts empty for every run, and the date is not set.
test("the owner creates an event type, a guest books it, the owner sees the booking", async ({
  page,
}) => {
  await createEventType(page, { id: "intro-30", title: "Знакомство" });

  await page.goto("/");
  await page.getByRole("link", { name: "Записаться на звонок" }).click();
  await page.getByRole("link", { name: "Знакомство" }).click();
  await openRoomyDay(page);
  const slot = page.getByRole("button", { name: /^\d\d:\d\d–\d\d:\d\d/ }).first();
  const slotName = await slot.textContent();
  await slot.click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("textbox", { name: "Имя" }).fill("Анна");
  await page.getByRole("textbox", { name: "Email" }).fill(guestEmail);
  await page.getByRole("textbox", { name: "Тема разговора" }).fill(topic);
  await page.getByRole("button", { name: "Подтвердить бронирование" }).click();
  const confirmation = page.getByRole("region", {
    name: "Бронирование подтверждено. До встречи!",
  });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText(topic);

  // The booked slot stays in the list and is no longer free.
  await page.getByRole("button", { name: "Забронировать ещё" }).click();
  await expect(
    page.getByRole("button", { name: slotName!.replace("Свободно", " Занято") }),
  ).toBeDisabled();

  await page.getByRole("link", { name: "Предстоящие бронирования" }).click();
  const card = page
    .getByRole("article")
    .filter({ hasText: "Знакомство" })
    .filter({ hasText: guestEmail });
  await expect(card).toContainText("Анна");
  await expect(card).toContainText(`Тема: ${topic}`);
});

// The server and its storage are shared with the first test, so this type and guest are distinct.
test("a guest books without a topic and the owner sees no topic line", async ({ page }) => {
  await createEventType(page, { id: "no-topic-30", title: "Короткий звонок" });

  await page.goto("/");
  await page.getByRole("link", { name: "Записаться на звонок" }).click();
  await page.getByRole("link", { name: "Короткий звонок" }).click();
  await openRoomyDay(page);
  await page
    .getByRole("button", { name: /^\d\d:\d\d–\d\d:\d\d Свободно$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("textbox", { name: "Имя" }).fill("Борис");
  await page.getByRole("textbox", { name: "Email" }).fill(guestEmailWithoutTopic);
  await expect(page.getByRole("textbox", { name: "Тема разговора" })).toHaveValue("");
  await page.getByRole("button", { name: "Подтвердить бронирование" }).click();
  const confirmation = page.getByRole("region", {
    name: "Бронирование подтверждено. До встречи!",
  });
  await expect(confirmation).toBeVisible();
  // A booking without a topic has no topic line.
  await expect(confirmation.getByRole("paragraph")).toHaveText(["Борис", guestEmailWithoutTopic]);

  await page.getByRole("link", { name: "Предстоящие бронирования" }).click();
  const card = page
    .getByRole("article")
    .filter({ hasText: "Короткий звонок" })
    .filter({ hasText: guestEmailWithoutTopic });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Борис");
  await expect(card).not.toContainText("Тема:");
});
