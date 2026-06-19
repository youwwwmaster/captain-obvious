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
COPY terms.md ./

EXPOSE 3000

# Health check — порт из WEBHOOK_PORT (.env), не хардкод
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "const p=process.env.WEBHOOK_PORT;if(!p)process.exit(1);require('http').get('http://127.0.0.1:'+p+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
