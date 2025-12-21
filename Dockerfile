FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY data ./data
COPY src/locales ./dist/locales

ENV NODE_ENV=production
ENV DATA_PATH=/app/data

VOLUME ["/app/data"]

CMD ["node", "dist/index.js"]
