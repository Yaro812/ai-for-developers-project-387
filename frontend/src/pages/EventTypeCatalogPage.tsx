import { Anchor, Card, Container, Loader, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listEventTypes } from "../generated/sdk.gen.ts";
import type { EventType } from "../generated/types.gen.ts";

const title = "Каталог типов встреч";

export default function EventTypeCatalogPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>();
  const [failed, setFailed] = useState(false);

  // Loads once on open; after a network or server error the guest reloads the page.
  useEffect(() => {
    listEventTypes().then(({ data, error }) => (error ? setFailed(true) : setEventTypes(data)));
  }, []);

  return (
    <Container component="main" py="xl">
      <title>{title}</title>
      <Stack gap="lg" align="flex-start">
        <Title>{title}</Title>
        {failed && <Text>Не удалось загрузить страницу, обновите её</Text>}
        {!eventTypes && !failed && <Loader role="progressbar" aria-label="Загрузка" />}
        {eventTypes?.length === 0 && <Text>Типов встреч пока нет</Text>}
        {eventTypes?.map((eventType) => (
          <Card key={eventType.id} withBorder>
            <Title order={2}>
              <Anchor component={Link} to={`/book/${eventType.id}`}>
                {eventType.title}
              </Anchor>
            </Title>
            <Text>{eventType.durationMinutes} мин.</Text>
            {eventType.description && <Text>{eventType.description}</Text>}
          </Card>
        ))}
        <Anchor component={Link} to="/">
          На главную
        </Anchor>
      </Stack>
    </Container>
  );
}
