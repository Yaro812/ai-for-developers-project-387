import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { createBooking, getEventType, listSlots } from "../generated/sdk.gen.ts";
import type { Booking, BookingWindowDay, EventType } from "../generated/types.gen.ts";
import { ownerTimeZoneCaption, timeRange } from "../owner-time.ts";

// A window day is a plain date in the owner's time zone; read at UTC midnight, it formats back to itself in UTC.
const plainDate = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ru", { ...options, timeZone: "UTC" });
// «пн, 23 нояб.», the name of a calendar day button.
const dayLabel = plainDate({ weekday: "short", day: "numeric", month: "short" });
// «понедельник, 23 ноября».
const fullDay = plainDate({ weekday: "long", day: "numeric", month: "long" });
// «ноябрь 2026 г.».
const monthLabel = plainDate({ month: "long", year: "numeric" });
const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// The six weeks, Monday first, that cover a month like `2026-11`, as plain dates.
function monthCells(month: string) {
  const first = new Date(`${month}-01`);
  const beforeFirst = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) =>
    new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - beforeFirst + index))
      .toISOString()
      .slice(0, 10),
  );
}

const monthOf = (date: string) => date.slice(0, 7);
const freeCount = ({ slots }: BookingWindowDay) => slots.filter(({ free }) => free).length;

type Guest = { name: string; email: string };

const refusals = {
  BOOKING_CONFLICT: "Это время уже занято, выберите другой слот",
  TIME_UNAVAILABLE: "Это время больше недоступно, выберите другой слот",
};

// The contract's rules for the guest, checked on trimmed values before sending;
// the fields cap the lengths, and the server checks everything again.
function check({ name, email }: Guest) {
  const errors: Partial<Guest> = {};
  if (!name) errors.name = "Укажите имя";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Неверный формат email";
  return errors;
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper bg="gray.1" p="sm">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text>{value}</Text>
    </Paper>
  );
}

export default function BookingPage() {
  const { id = "" } = useParams();
  const [eventType, setEventType] = useState<EventType>();
  // Undefined while the slots load.
  const [days, setDays] = useState<BookingWindowDay[]>();
  // The heading of the screen that replaces the page when the event type does not exist.
  const [missing, setMissing] = useState<string>();
  const [failed, setFailed] = useState(false);
  // The choice lives only in the page state, never in the URL.
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedStart, setSelectedStart] = useState<string>();
  // The month the guest turned the calendar to; until then the calendar shows the selected day's month.
  const [turnedMonth, setTurnedMonth] = useState<string>();
  // True once the guest pressed «Продолжить»: the form replaces the calendar and the slots.
  const [confirming, setConfirming] = useState(false);
  // The guest's input outlives the form, so another day or slot keeps it.
  const [guest, setGuest] = useState<Guest>({ name: "", email: "" });
  const [errors, setErrors] = useState<Partial<Guest>>({});
  const [pending, setPending] = useState(false);
  const [booking, setBooking] = useState<Booking>();
  const [saveFailed, setSaveFailed] = useState(false);
  // Why the server refused the chosen slot; gone once the guest picks another.
  const [refusal, setRefusal] = useState<string>();

  // Both requests start at once and the page waits for both; it loads once on open,
  // and after a network or server error the guest reloads the page.
  useEffect(() => {
    const path = { id };
    Promise.all([getEventType({ path }), listSlots({ path })]).then(
      ([eventTypeAnswer, slotsAnswer]) => {
        if (eventTypeAnswer.error?.code === "EVENT_TYPE_NOT_FOUND") {
          setMissing("Тип встречи не найден");
        } else if (eventTypeAnswer.data && slotsAnswer.data) {
          setEventType(eventTypeAnswer.data);
          setDays(slotsAnswer.data);
        } else {
          setFailed(true);
        }
      },
    );
  }, [id]);

  // The dates come from the server, never from the browser clock. The guest's day stays while it
  // has free slots, and under a confirmed booking even without them; otherwise, and until the
  // guest picks one, the first day with free slots is selected.
  const picked = days?.find(({ date }) => date === selectedDate);
  const day =
    (picked && (booking || freeCount(picked) > 0) ? picked : undefined) ??
    days?.find((day) => freeCount(day) > 0);
  const slot = day?.slots.find(({ start }) => start === selectedStart);
  const heading = missing ?? eventType?.title;
  const step = booking ? "done" : confirming && slot ? "form" : "choose";

  // The window takes one or two months, and the arrows turn the calendar between them.
  const months = [...new Set(days?.map(({ date }) => monthOf(date)))];
  const month = turnedMonth ?? (day ? monthOf(day.date) : months[0]);
  const monthIndex = months.indexOf(month);

  const guestField = (key: keyof Guest) => ({
    value: guest[key],
    error: errors[key],
    onChange: ({ currentTarget }: ChangeEvent<HTMLInputElement>) =>
      setGuest((guest) => ({ ...guest, [key]: currentTarget.value })),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = { name: guest.name.trim(), email: guest.email.trim() };
    const found = check(trimmed);
    setErrors(found);
    setSaveFailed(false);
    if (!slot || Object.keys(found).length > 0) return;

    setPending(true);
    const { data, error } = await createBooking({
      path: { id },
      body: { start: slot.start, guestName: trimmed.name, guestEmail: trimmed.email },
    });
    setPending(false);
    if (data) {
      setBooking(data);
      // The booked slots are no longer free; a failed reload keeps the old ones until the page reloads.
      const slotsAnswer = await listSlots({ path: { id } });
      if (slotsAnswer.data) setDays(slotsAnswer.data);
    } else if (error?.code === "BOOKING_CONFLICT" || error?.code === "TIME_UNAVAILABLE") {
      // The slot is gone: the page shows why and fresh slots; the input stays for the next slot.
      setRefusal(refusals[error.code]);
      setSelectedStart(undefined);
      setConfirming(false);
      setDays(undefined);
      const slotsAnswer = await listSlots({ path: { id } });
      if (slotsAnswer.data) setDays(slotsAnswer.data);
      else setFailed(true);
    } else if (error?.code === "EVENT_TYPE_NOT_FOUND") {
      // The event type vanished, e.g. after a server restart: the screen keeps no header.
      setMissing("Этот тип встречи больше не существует");
      setEventType(undefined);
    } else {
      setSaveFailed(true);
    }
  }

  const chosenTime = booking ?? slot;
  const information = eventType && (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="sm">
        <Title order={2} size="h4">
          Информация
        </Title>
        <Fact
          label="Выбранная дата"
          value={day ? fullDay.format(new Date(day.date)) : "Дата не выбрана"}
        />
        <Fact
          label="Выбранное время"
          value={chosenTime ? timeRange(chosenTime) : "Время не выбрано"}
        />
        <Fact label="Свободных слотов" value={day ? freeCount(day) : 0} />
        <Fact label="Длительность" value={`${eventType.durationMinutes} мин.`} />
        <Text size="sm" c="dimmed">
          {ownerTimeZoneCaption}
        </Text>
      </Stack>
    </Card>
  );

  return (
    <Container component="main" py="xl">
      {failed && <Text>Не удалось загрузить страницу, обновите её</Text>}
      {!heading && !failed && <Loader role="progressbar" aria-label="Загрузка" />}
      {heading && !failed && (
        <Stack gap="lg">
          <title>{heading}</title>
          <Title>{heading}</Title>
          {eventType?.description && (
            <Text style={{ whiteSpace: "pre-wrap" }}>{eventType.description}</Text>
          )}
          {missing && (
            <Anchor component={Link} to="/book">
              К каталогу типов встреч
            </Anchor>
          )}
          {refusal && <Alert color="yellow">{refusal}</Alert>}
          {eventType && !days && <Loader role="progressbar" aria-label="Загрузка" />}
          {eventType && days && step === "choose" && (
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
              {information}
              <Card withBorder radius="lg" padding="lg">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Title order={2} size="h4">
                      Календарь
                    </Title>
                    <Group gap="xs">
                      <ActionIcon
                        variant="default"
                        aria-label="Предыдущий месяц"
                        disabled={monthIndex <= 0}
                        onClick={() => setTurnedMonth(months[monthIndex - 1])}
                      >
                        ←
                      </ActionIcon>
                      <ActionIcon
                        variant="default"
                        aria-label="Следующий месяц"
                        disabled={monthIndex >= months.length - 1}
                        onClick={() => setTurnedMonth(months[monthIndex + 1])}
                      >
                        →
                      </ActionIcon>
                    </Group>
                  </Group>
                  <Text size="sm">{monthLabel.format(new Date(`${month}-01`))}</Text>
                  <SimpleGrid cols={7} spacing={4} verticalSpacing={4}>
                    {weekdays.map((weekday) => (
                      <Text key={weekday} size="xs" fw={700} c="dimmed" ta="center">
                        {weekday}
                      </Text>
                    ))}
                    {monthCells(month).map((date) => {
                      const windowDay = days.find((day) => day.date === date);
                      const number = Number(date.slice(8));
                      // A date outside the booking window is not a choice, so it is not a button.
                      if (!windowDay) {
                        return (
                          <Paper key={date} bg="gray.2" c="gray.5" h={52} pt={14}>
                            <Text size="sm" ta="center">
                              {number}
                            </Text>
                          </Paper>
                        );
                      }
                      const free = freeCount(windowDay);
                      const selected = date === day?.date;
                      return (
                        <Button
                          key={date}
                          variant={selected ? "light" : "default"}
                          h={52}
                          px={0}
                          aria-pressed={selected}
                          aria-label={`${dayLabel.format(new Date(date))}, свободно: ${free}`}
                          disabled={free === 0}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedStart(undefined);
                          }}
                        >
                          <Box component="span" style={{ display: "grid", justifyItems: "center" }}>
                            {number}
                            {free > 0 && (
                              <Text span size="xs" fw={400} c="dimmed">
                                {free} св.
                              </Text>
                            )}
                          </Box>
                        </Button>
                      );
                    })}
                  </SimpleGrid>
                </Stack>
              </Card>
              <Card withBorder radius="lg" padding="lg">
                <Stack gap="sm">
                  <Title order={2} size="h4">
                    Статус слотов
                  </Title>
                  {!day && <Text>В ближайшие 14 дней свободного времени нет</Text>}
                  {day && (
                    // A plain block scrolls; in a flex column the buttons would shrink instead.
                    <Box mah={352} pr={4} style={{ overflowY: "auto" }}>
                      <Stack gap="xs">
                        {day.slots.map((slot) => (
                          <Button
                            key={slot.start}
                            variant={slot.start === selectedStart ? "light" : "default"}
                            fullWidth
                            justify="space-between"
                            aria-pressed={slot.start === selectedStart}
                            disabled={!slot.free}
                            rightSection={
                              <Text span size="xs" fw={700}>
                                {slot.free ? "Свободно" : "Занято"}
                              </Text>
                            }
                            onClick={() => {
                              // Pins the day the page selected by itself, so it stays under the booking.
                              setSelectedDate(day.date);
                              setSelectedStart(slot.start);
                              setRefusal(undefined);
                            }}
                          >
                            {timeRange(slot)}
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  <SimpleGrid cols={2} spacing="sm">
                    <Button component={Link} to="/book" variant="default">
                      Назад
                    </Button>
                    <Button disabled={!slot} onClick={() => setConfirming(true)}>
                      Продолжить
                    </Button>
                  </SimpleGrid>
                </Stack>
              </Card>
            </SimpleGrid>
          )}
          {eventType && days && step === "form" && (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {information}
              <Card withBorder radius="lg" padding="lg">
                {/* noValidate: the page shows its own messages instead of the browser's. */}
                <form noValidate onSubmit={submit}>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={2} size="h4">
                        Подтверждение бронирования
                      </Title>
                      <Button variant="default" onClick={() => setConfirming(false)}>
                        Изменить
                      </Button>
                    </Group>
                    <TextInput label="Имя" maxLength={100} {...guestField("name")} />
                    <TextInput
                      label="Email"
                      type="email"
                      maxLength={254}
                      {...guestField("email")}
                    />
                    {saveFailed && (
                      <Alert color="red">Не удалось сохранить бронирование, проверьте данные</Alert>
                    )}
                    <Button type="submit" fullWidth loading={pending}>
                      Подтвердить бронирование
                    </Button>
                  </Stack>
                </form>
              </Card>
            </SimpleGrid>
          )}
          {/* The confirmation replaces the choice of day and slot. */}
          {eventType && days && booking && (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {information}
              <Card
                component="section"
                aria-labelledby="booked"
                withBorder
                radius="lg"
                padding="lg"
                bg="gray.1"
              >
                <Stack gap="xs">
                  <Title order={2} size="h3" id="booked" ta="center">
                    Бронирование подтверждено. До встречи!
                  </Title>
                  <Text ta="center">{booking.guestName}</Text>
                  <Text ta="center">{booking.guestEmail}</Text>
                  <Button
                    fullWidth
                    mt="sm"
                    onClick={() => {
                      setBooking(undefined);
                      setSelectedStart(undefined);
                      setConfirming(false);
                    }}
                  >
                    Забронировать ещё
                  </Button>
                </Stack>
              </Card>
            </SimpleGrid>
          )}
        </Stack>
      )}
    </Container>
  );
}
