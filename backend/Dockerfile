# CRM SAAS BACKEND - DOCKERFILE MULTI-STAGE (Render)

FROM node:22-alpine AS dependencies
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --legacy-peer-deps --include=dev

FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json .npmrc ./
COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
