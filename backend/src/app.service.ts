import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    let dbStatus = 'not_checked';

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('database health check timeout')), 1500)),
      ]);
      dbStatus = 'connected';
    } catch (error: any) {
      dbStatus = `degraded: ${error.message || 'unknown error'}`;
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      service: 'crm-backend',
      database: dbStatus,
      environment: process.env.NODE_ENV || 'production',
    };
  }
}
