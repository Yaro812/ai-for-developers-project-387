import "@mantine/core/styles.css";
import {
  Anchor,
  Box,
  Button,
  Container,
  Flex,
  Group,
  MantineProvider,
  createTheme,
} from "@mantine/core";
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from "react-router";
import BookingPage from "./pages/BookingPage.tsx";
import EventTypeCatalogPage from "./pages/EventTypeCatalogPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import NewEventTypePage from "./pages/NewEventTypePage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import UpcomingBookingsPage from "./pages/UpcomingBookingsPage.tsx";

const theme = createTheme({
  primaryColor: "orange",
  defaultRadius: "md",
  // Full width up to the size: a page is a flex item of the layout and would shrink to its content.
  components: { Container: Container.extend({ defaultProps: { size: "lg", w: "100%" } }) },
});

const sections = [
  { to: "/book", label: "Записаться" },
  { to: "/owner/bookings", label: "Предстоящие бронирования" },
  { to: "/owner/event-types/new", label: "Новый тип встречи" },
];

// The header every page shares; a page renders its own `main` under it.
function Layout() {
  const { pathname } = useLocation();
  return (
    <Flex direction="column" mih="100vh" bg="gray.0">
      <Box component="header" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
        <Container py="sm">
          <Group justify="space-between">
            <Anchor component={Link} to="/" c="dark" fw={700} underline="never">
              <Group gap={8}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--mantine-color-orange-6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
                Календарь звонков
              </Group>
            </Anchor>
            <Group component="nav" gap="xs">
              {sections.map(({ to, label }) => {
                // The booking page lives under the catalog's address, so it keeps «Записаться» current.
                const current = pathname.startsWith(to);
                return (
                  <Button
                    key={to}
                    component={Link}
                    to={to}
                    color="gray"
                    variant={current ? "light" : "subtle"}
                    aria-current={current ? "page" : undefined}
                  >
                    {label}
                  </Button>
                );
              })}
            </Group>
          </Group>
        </Container>
      </Box>
      <Outlet />
    </Flex>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<EventTypeCatalogPage />} />
            <Route path="/book/:id" element={<BookingPage />} />
            <Route path="/owner/event-types/new" element={<NewEventTypePage />} />
            <Route path="/owner/bookings" element={<UpcomingBookingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
