import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { QuotesModule } from './modules/quotes/quotes.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { ImportationsModule } from './modules/importations/importations.module.js';
import { ActivitiesModule } from './modules/activities/activities.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { AiConfigModule } from './modules/ai-config/ai-config.module.js';
import { AiChatModule } from './modules/ai-chat/ai-chat.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';
import { AutomationsModule } from './modules/automations/automations.module.js';
import { ZeniorModule } from './modules/zenior/zenior.module.js';
import { ZernioModule } from './modules/zernio/zernio.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { ChatbotConfigModule } from './modules/chatbot-config/chatbot-config.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { AiUsageModule } from './modules/ai-usage/ai-usage.module.js';
import { SegmentsModule } from './modules/segments/segments.module.js';
import { CampaignsModule } from './modules/campaigns/campaigns.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';
import { CampaignConfigModule } from './modules/campaign-config/campaign-config.module.js';
import { ConsentModule } from './modules/consent/consent.module.js';
import { OptOutModule } from './modules/opt-out/opt-out.module.js';

@Module({
  imports: [
    PrismaModule,
    LeadsModule,
    CustomersModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    QuotesModule,
    OrdersModule,
    ImportationsModule,
    ActivitiesModule,
    ReportsModule,
    DashboardModule,
    AiConfigModule,
    AiChatModule,
    RecommendationsModule,
    AutomationsModule,
    ZeniorModule,
    ZernioModule,
    ChatbotConfigModule,
    ConversationsModule,
    AiUsageModule,
    ScheduleModule.forRoot(),
    // Caché en memoria (hasta que configuremos Redis)
    CacheModule.register({
      isGlobal: true,
      ttl: 60000, // 60 segundos
    }),
    // Seguridad contra ataques de fuerza bruta (Rate limiting)
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // Máximo 100 peticiones por minuto por IP
    }]),
    SegmentsModule,
    CampaignsModule,
    TemplatesModule,
    CampaignConfigModule,
    ConsentModule,
    OptOutModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule {}
