# ==============================================================================
# CRM SAAS BACKEND - DOCKERFILE MULTI-STAGE (Railway / Render / Cloud Run)
# ==============================================================================

# --- Etapa 1: Dependencias ---
FROM node:22-alpine AS dependencies
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Etapa 2: Builder ---
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma

# Generar cliente de Prisma
RUN npx prisma generate

# Copiar código fuente y compilar NestJS
COPY src ./src
RUN npm run build

# Limpiar dependencias de desarrollo para aligerar la imagen
RUN npm prune --omit=dev

# --- Etapa 3: Runner de Producción ---
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Crear usuario sin privilegios root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh
USER nestjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
