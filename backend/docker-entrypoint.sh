#!/bin/sh
set -e

echo "🚀 Verificando migraciones con Prisma en Supabase..."
npx prisma migrate deploy || echo "⚠️ Advertencia en prisma migrate deploy (puede ser por conexión de pooling)."

echo "⚡ Iniciando servidor CRM NestJS en 0.0.0.0:${PORT:-3001}..."
exec node dist/main.js
