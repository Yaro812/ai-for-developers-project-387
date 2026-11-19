import { Card, Container, Loader, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { listUpcomingBookings } from "../generated/sdk.gen.ts";
import type { Booking } from "../generated/types.gen.ts";
import { dateTime, longDay, ownerTimeZoneCaption, timeRange } from "../owner-time.ts";

const title = "Предстоящие бронирования";

export default function UpcomingBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>();
  const [failed, setFailed] = useState(false);

  // Loads once on open; the owner reloads the page to see new bookings or after an error.
  useEffect(() => {
    listUpcomingBookings().then(({ data, error }) => (error ? setFailed(true) : setBookings(data)));
  }, []);

  return (
    <Container component="main" py="xl">
      <title>{title}</title>
      <Stack gap="lg">
        <Title>{title}</Title>
        {failed && <Text>Не удалось загрузить страницу, обновите её</Text>}
        {!bookings && !failed && <Loader role="progressbar" aria-label="Загрузка" />}
        {bookings?.length === 0 && <Text>Предстоящих бронирований нет</Text>}
        {!!bookings?.length && (
          <>
            <Text>{ownerTimeZoneCaption}</Text>
            {/* The server sends bookings by start; `start` is unique, as bookings never overlap. */}
            {bookings.map((booking) => (
              <Card key={booking.start} component="article" withBorder radius="lg" padding="lg">
                <Text fw={700}>{booking.guestName}</Text>
                <Text c="dimmed">{booking.guestEmail}</Text>
                <Text c="dimmed">{booking.eventType.title}</Text>
                <Text c="dimmed">
                  Слот: {longDay.format(new Date(booking.start))}, {timeRange(booking)}
                </Text>
                <Text c="dimmed">Создано: {dateTime.format(new Date(booking.createdAt))}</Text>
              </Card>
            ))}
          </>
        )}
      </Stack>
    </Container>
  );
}
