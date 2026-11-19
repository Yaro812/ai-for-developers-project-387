import { Anchor, Container, Stack, Title } from "@mantine/core";
import { Link } from "react-router";

const title = "Страница не найдена";

export default function NotFoundPage() {
  return (
    <Container component="main" py="xl">
      <title>{title}</title>
      <Stack gap="lg" align="flex-start">
        <Title>{title}</Title>
        <Anchor component={Link} to="/">
          На главную
        </Anchor>
      </Stack>
    </Container>
  );
}
