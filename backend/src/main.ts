import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar validaciones globales de forma estricta (class-validator)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Remueve datos basura/no definidos en el DTO
    forbidNonWhitelisted: true, // Lanza error si envían campos no esperados
    transform: true, // Transforma automáticamente payloads a objetos DTO reales
  }));

  // Seguridad: Cabeceras HTTP seguras adaptadas para API REST
  app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar CSP para APIs REST que devuelven JSON
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Orígenes permitidos (soporta FRONTEND_URL con múltiples URLs separadas por coma)
  const envFrontendUrls = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    ...envFrontendUrls,
  ];

  app.enableCors({
    origin: true, // Refleja dinámicamente cualquier origen de Vercel/localhost eliminando bloqueos CORS
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-tenant-id',
      'x-user-id',
      'x-role',
      'Cache-Control',
      'Pragma',
      'Expires',
      'baggage',
      'sentry-trace',
      'traceparent',
      'prefer',
      'x-request-id',
    ],
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'x-total-count'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend CRM server running on http://0.0.0.0:${port}`);
}
bootstrap();
