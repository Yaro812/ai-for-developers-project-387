# AGENTS.md

Hexlet learning project «Календарь звонков (продолжение)»: the call booking service from the first project, with its development process automated in GitHub. The scenario and requirements are in `README.md`.

## Commands

`mise.toml` pins tool versions and defines tasks and dev servers; run everything through mise.

- `mise install` — pinned tools, npm dependencies, Git hooks, Chromium for the browser scenario (`mise run browser`) and the generated SDK and server types. A fresh clone needs `mise trust` first.
- `mise run generate` — the one generation command, run after changing `contract/main.tsp`: compiles TypeSpec to `contract/openapi.yaml`, then generates the SDK and server types from it. Commit `contract/openapi.yaml` with the TypeSpec change.
- `mise run check` — every check: lint; `mise run contract`, which fails if `contract/openapi.yaml` differs from what TypeSpec compiles to; `mise run sdk`, which regenerates the SDK and server types from `contract/openapi.yaml`; type check; tests; the browser scenario. CI (`.github/workflows/check.yml`) runs this same task, after `mise run browser -- --with-deps` adds Chromium's system libraries.
- `mise run lint` and `mise run fix` — hk steps from `hk.pkl` (oxlint, oxfmt, jactionlint); `fix` applies autofixes.
- `mise run typecheck`, `mise run test`, `mise run build` — each regenerates the SDK and server types first.
- `mise run start` — the production build: builds the frontend, then one server serves it and the API on `HOST` and `PORT` (default `127.0.0.1:3000`).
- `mise run e2e` — the browser scenario alone: Playwright Test in Chromium. Its `webServer` runs `mise run start` with a free `PORT` for every run, so the storage starts empty and worktrees never share a port; the scenario runs on real clocks. In `mise run check` it waits for the type check and the tests, because `mise run start` regenerates the files they read.
- `docker build -t calendar .` and `docker run -p 3000:3000 calendar` — the same production build in one container, built from sources by the multi-stage `Dockerfile`. Docker is not part of `mise run check`; the `docker` job in `.github/workflows/check.yml` builds the image and checks `GET /api/health` and `GET /`.
- One test: `npm test -w backend -- test/health.test.ts` or `npm test -w frontend -- -t "<test name>"`. Playwright options go after `--`: `mise run e2e -- --headed`.
- `mise daemons start`, `stop`, `status`, `logs` — backend and frontend dev servers. `mise daemons urls` shows the ports: 3000 and 5173 in the main checkout, other ports in each worktree.

## Structure

npm workspaces with one lockfile at the root.

- `contract/` — the API contract: `main.tsp` (TypeSpec), the committed `openapi.yaml` compiled from it, and `openapi-ts.config.ts` for `@hey-api/openapi-ts`.
- `backend/` — Fastify. `src/app.ts` builds the app and tests import it; `src/server.ts` only listens on `HOST` and `PORT` and passes the built frontend `frontend/dist`. With a `frontendRoot`, the app serves its files and answers `index.html` to any other GET path outside `/api/`; an unknown path under `/api/` gets the JSON 404 `ROUTE_NOT_FOUND`. Node runs TypeScript directly, so there is no build step: relative imports need the `.ts` extension and only erasable TypeScript syntax works. `fastify-openapi-glue` registers routes and request validation from `contract/openapi.yaml`; handlers form one object of the generated type `RouteHandlers`, keyed by `operationId`, and reply with `reply.code(n).send(body)`. A contract error is not sent: the handler throws an error class declared at the top of `src/app.ts` with `createError(code, message, statusCode)` from `@fastify/error`, and Fastify answers `{ statusCode, code, error, message }`. API tests build the app with `test/app.ts`, which adds `@fastify/response-validation`, and send requests with `app.inject`.
- `e2e/` — the browser scenario: `playwright.config.ts` and `*.spec.ts`. It walks the README path through the pages and finds elements by role, name and state.
- `frontend/` — Vite, React, React Router, Mantine. Each page has its own URL (`docs/adr/0002-client-side-routing.md`); tests run on Vitest with Testing Library and jsdom. Pages call the API through the generated SDK at the relative `/api`; the Vite dev server proxies it to the backend. Page tests answer the SDK's requests with `stubServer` from `src/test-server.ts`; a request without a stub fails.

## Rules

- The API is contract-first: TypeSpec → OpenAPI → frontend SDK and backend server types from `@hey-api/openapi-ts`. Declare operations in the service namespace with camelCase names, so `operationId` is the same in the SDK, `RouteHandlers` and route registration.
- Generated code lives in `frontend/src/generated/` (SDK) and `backend/src/generated/` (`RouteHandlers` and model types). It is git-ignored and never edited by hand: change `contract/main.tsp` and run `mise run generate`. Only `contract/openapi.yaml` is committed, and it is never edited by hand either.
- `@hey-api/openapi-ts` fails on TypeScript 7, which the workspaces use. The contract package has its own `typescript@6`, and `overrides` in the root `package.json` keeps the generator on it.
- Releases come from release-please (`.github/workflows/release-please.yml`, `release-please-config.json`): on each push to `main` it reads Conventional Commits and keeps a release PR open; merging that PR tags `vX.Y.Z` and creates a GitHub Release. It owns the one app version in the root `package.json`, `package-lock.json` and `.release-please-manifest.json`, and `CHANGELOG.md`; do not edit them by hand.
- `.github/workflows/hexlet-check.yml` is generated by Hexlet. Do not edit, delete or rename it, and do not rename the repository. It fails until all project steps are completed on Hexlet; that is expected.
- `.github/workflows/opencode.yml` runs the OpenCode agent on a `/oc` or `/opencode` comment from a trusted participant; `README.md`, section «Агент в GitHub», describes it and every later agent workflow. On that runner commit your changes yourself: OpenCode commits leftover changes under a free-form title, which the `commit-msg` hook rejects. A read outside the repository or of an `.env` file is refused there at once, as nobody answers a permission request.
- `.github/workflows/triage.yml` runs the same agent on a new issue from a trusted author, with the instruction in its `prompt`. It skips an issue labelled `ready-for-agent`, `ready-for-human`, `wontfix` or `wayfinder:*`, so publish a spec or a ticket with its label at creation, not afterwards.
- `.github/workflows/review.yml` reviews every pull request from a branch of this repository with the plain OpenCode CLI and the criteria in `REVIEW.md`; it comments and never changes code. A human passes a finding to the agent with `/oc`.
- `.github/workflows/opencode.yml` admits three commands per pull request; a run past the budget fails before the model is called, and its `report` job comments the reason. Batch the fixes of one review into one command.
- Open a pull request with `.github/pull_request_template.md` filled in: sources, checks with run links and the checked SHA, risk, rollback. The `check` workflow uploads the browser scenario's trace and the SHA as the artifact `browser-<SHA>`.
- `.mcp.json` connects the Railway MCP server (`railway mcp local`; `mise.toml` pins the Railway CLI), through which the agent deploys the app to Railway from the `Dockerfile`. The server acts as the user signed in with `mise exec -- railway login`; the session lives in `~/.railway`, and no token belongs in a file under Git.
- Each worktree gets its tools and npm dependencies through hooks in `.claude/`. Triggers and manual cleanup: `docs/agents/worktrees.md`.

## Коммиты

Самостоятельно коммить завершённые изменения после проверок.
Используй Conventional Commits, в scope указывай компонент проекта.
Для работы по тикету добавляй его ключ в заголовок.
Коммит реализации ссылается на тикет GitHub Issues, который он закрывает: номер в скобках в конце заголовка, например `feat(backend): запись на свободный слот (#19)`.
В описании объясняй причину изменения и новое поведение.
Включай в коммит только изменения своей задачи.
Формат заголовка проверяет хук `commit-msg`.
Pull request, который вливается merge-коммитом, называй не в формате Conventional Commits, например «Календарь звонков по спецификации (#13)». GitHub кладёт заголовок PR в тело merge-коммита, и release-please прочитал бы его как ещё одну запись changelog поверх коммитов самого PR.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`Yaro812/ai-for-developers-project-387`), operated through the `gh` CLI. See `docs/agents/issue-tracker.md`.

The app was built in the first project, `Yaro812/ai-for-developers-project-386`; its specification and decision tickets stay there and are read-only. Links: `docs/agents/issue-tracker.md`, section «First project».

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
