import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "react-router";

// Two soft spots of colour over the layout's background.
const background = [
  "radial-gradient(circle at 15% 20%, var(--mantine-color-blue-1), transparent 45%)",
  "radial-gradient(circle at 85% 0%, var(--mantine-color-orange-1), transparent 40%)",
].join(", ");

export default function HomePage() {
  return (
    <Box flex={1} style={{ background }}>
      <Container component="main" py={56}>
        <title>Календарь звонков</title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          <Stack gap="md" align="flex-start">
            <Badge variant="default" radius="xl">
              Бронирование без регистрации
            </Badge>
            <Title size={48}>Календарь звонков</Title>
            <Text size="lg" c="dimmed">
              Забронируйте звонок с владельцем календаря: выберите подходящий тип встречи и
              свободный слот в ближайшие две недели.
            </Text>
            <Button component={Link} to="/book" size="lg">
              Записаться на звонок
            </Button>
          </Stack>
          <Card withBorder radius="lg" padding="lg">
            <Stack gap="sm">
              <Title order={2} size="h4">
                Как это работает
              </Title>
              <List type="ordered" spacing="xs" c="dimmed">
                <List.Item>Выберите тип встречи.</List.Item>
                <List.Item>Выберите день и свободный слот.</List.Item>
                <List.Item>Подтвердите бронирование.</List.Item>
              </List>
            </Stack>
          </Card>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
