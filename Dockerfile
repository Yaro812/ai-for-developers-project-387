# Same Node version as mise.toml.
FROM node:26.13.1-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY contract/package.json contract/
COPY frontend/package.json frontend/
RUN npm ci
COPY . .
# TypeSpec → OpenAPI → SDK and server types, then the frontend, as `mise run generate` and `mise run build` do.
RUN npm run openapi -w contract && npm run sdk -w contract && npm run build -w frontend

FROM node:26.13.1-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --omit=dev -w backend
# Node runs the backend sources without a build; the server reads the OpenAPI file at start.
COPY --from=build /app/backend/src backend/src
COPY --from=build /app/contract/openapi.yaml contract/
COPY --from=build /app/frontend/dist frontend/dist
ENV HOST=0.0.0.0
EXPOSE 3000
USER node
CMD ["node", "backend/src/server.ts"]
