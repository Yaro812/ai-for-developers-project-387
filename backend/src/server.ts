import { fileURLToPath } from "node:url";
import { buildApp } from "./app.ts";

// `mise run build` puts the frontend here; in development Vite serves it instead.
const frontendRoot = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
const app = buildApp({ logger: true, frontendRoot });
// In a container Node runs as PID 1, which ignores these signals without a handler,
// so `docker stop` and Ctrl+C would wait for SIGKILL.
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => void app.close());

try {
  await app.listen({
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? 3000),
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
