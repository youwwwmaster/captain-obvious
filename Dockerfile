FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
COPY prompt.md ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD sh -c "wget -qO- http://127.0.0.1:$${WEBHOOK_PORT:-3000}/health || exit 1"

CMD ["node", "dist/main.js"]
