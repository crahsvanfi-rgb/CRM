/**
 * SCRIPT DE LIMPIEZA TOTAL DE DATOS DE SIMULACIÓN EN SUPABASE / POSTGRESQL
 * 
 * Este script elimina de forma segura todos los datos de negocio y simulación
 * respetando la integridad referencial y las claves foráneas (FK).
 * 
 * TABLAS PRESERVADAS (NO SE TOCAN):
 * - Tenant (Empresas)
 * - User (Usuarios administradores, asesores y otros)
 * - Role (Roles y permisos RBAC/ABAC)
 * - AIConfiguration (Configuración de IA, modelos y API Keys)
 * - ChatbotConfiguration (Configuraciones de chatbot)
 * - ChannelConnection (Configuraciones de WhatsApp/Zernio y API Keys)
 * - CampaignConfig (Configuración general de campañas)
 * 
 * TABLAS LIMPIADAS (DATOS DE NEGOCIO):
 * - Leads, LeadTouchpoint, LeadActivity
 * - Customers, CustomerNote, CustomerActivity
 * - Products, Categories, ProductStock, InventoryMovement, Warehouse
 * - Quotes, QuoteItem
 * - Orders, OrderItem
 * - Importations, ImportationItem, Supplier
 * - Activities (Agenda)
 * - Conversations, Messages, MessageAttachments
 * - Campaigns, CampaignRecipient, CampaignMessage, CampaignTemplate, CampaignCost, CampaignExecution, CampaignEvent
 * - Segments
 * - Recommendations
 * - Automations, AutomationExecution
 * - AIUsage, AIMessage
 * - Consent, OptOut
 * - AuditLog
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tablas protegidas que NUNCA deben eliminarse
const PROTECTED_MODELS = [
  { key: 'tenant', label: 'Tenant (Empresas)' },
  { key: 'user', label: 'User (Usuarios / Administradores)' },
  { key: 'role', label: 'Role (Roles y Permisos)' },
  { key: 'aIConfiguration', label: 'AIConfiguration (Configuración IA & API Keys)' },
  { key: 'chatbotConfiguration', label: 'ChatbotConfiguration (Configuraciones Chatbot)' },
  { key: 'channelConnection', label: 'ChannelConnection (Conexiones Zernio & API Keys)' },
  { key: 'campaignConfig', label: 'CampaignConfig (Configuración General de Campañas)' },
] as const;

// Orden estricto de eliminación respetando dependencias de claves foráneas
// (Primero tablas hijas, luego padres intermedios, finalmente padres raíz)
const BUSINESS_MODELS_CLEANUP_ORDER = [
  // 1. Archivos adjuntos y mensajes de chat
  { key: 'messageAttachment', label: 'MessageAttachment' },
  { key: 'message', label: 'Message' },
  { key: 'conversation', label: 'Conversation' },

  // 2. Eventos, ejecuciones, costos y mensajes de campañas
  { key: 'campaignEvent', label: 'CampaignEvent' },
  { key: 'campaignCost', label: 'CampaignCost' },
  { key: 'campaignExecution', label: 'CampaignExecution' },
  { key: 'campaignMessage', label: 'CampaignMessage' },
  { key: 'campaignRecipient', label: 'CampaignRecipient' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'campaignTemplate', label: 'CampaignTemplate' },
  { key: 'segment', label: 'Segment' },

  // 3. Consentimientos, desuscripciones, IA, auditoría y automatizaciones
  { key: 'consent', label: 'Consent' },
  { key: 'optOut', label: 'OptOut' },
  { key: 'automationExecution', label: 'AutomationExecution' },
  { key: 'automation', label: 'Automation' },
  { key: 'recommendation', label: 'Recommendation' },
  { key: 'aIMessage', label: 'AIMessage' },
  { key: 'aIUsage', label: 'AIUsage' },
  { key: 'auditLog', label: 'AuditLog' },

  // 4. Actividades y seguimiento de clientes/leads
  { key: 'leadTouchpoint', label: 'LeadTouchpoint' },
  { key: 'leadActivity', label: 'LeadActivity' },
  { key: 'customerNote', label: 'CustomerNote' },
  { key: 'customerActivity', label: 'CustomerActivity' },
  { key: 'activity', label: 'Activity (Agenda)' },

  // 5. Ventas, Cotizaciones e Inventario
  // OrderItem depende de Order y Product
  { key: 'orderItem', label: 'OrderItem' },
  // InventoryMovement depende de Order, Importation, Warehouse y Product
  { key: 'inventoryMovement', label: 'InventoryMovement' },
  // Order depende de Quote y Customer
  { key: 'order', label: 'Order' },
  // QuoteItem depende de Quote y Product
  { key: 'quoteItem', label: 'QuoteItem' },
  // Quote depende de Customer
  { key: 'quote', label: 'Quote' },
  // ImportationItem depende de Importation y Product
  { key: 'importationItem', label: 'ImportationItem' },
  // Importation depende de Supplier
  { key: 'importation', label: 'Importation' },
  // ProductStock depende de Product y Warehouse
  { key: 'productStock', label: 'ProductStock' },
  // Product depende de Category
  { key: 'product', label: 'Product' },
  // Warehouse depende de Tenant
  { key: 'warehouse', label: 'Warehouse' },
  // Category depende de Tenant
  { key: 'category', label: 'Category' },
  // Supplier depende de Tenant
  { key: 'supplier', label: 'Supplier' },

  // 6. Clientes y Leads
  // Customer tiene relación leadId opcional hacia Lead, por lo que se elimina primero
  { key: 'customer', label: 'Customer' },
  // Lead depende de Tenant y User
  { key: 'lead', label: 'Lead' },
] as const;

async function runCleanup() {
  console.log('===============================================================');
  console.log('🧹 INICIANDO LIMPIEZA TOTAL DE DATOS DE NEGOCIO Y SIMULACIÓN');
  console.log('===============================================================\n');

  // Paso 1: Conteo inicial de registros protegidos
  console.log('🔒 1. Verificando tablas protegidas (NO serán modificadas):');
  for (const item of PROTECTED_MODELS) {
    try {
      const count = await (prisma as any)[item.key].count();
      console.log(`   ✓ ${item.label.padEnd(50)}: ${count} registros`);
    } catch (err: any) {
      console.warn(`   ⚠️ No se pudo contar ${item.label}: ${err.message}`);
    }
  }

  // Paso 2: Conteo inicial de tablas de negocio
  console.log('\n📊 2. Conteo previo de tablas de negocio a limpiar:');
  let totalBusinessRows = 0;
  for (const item of BUSINESS_MODELS_CLEANUP_ORDER) {
    try {
      const count = await (prisma as any)[item.key].count();
      if (count > 0) {
        console.log(`   - ${item.label.padEnd(30)}: ${count} registros`);
        totalBusinessRows += count;
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Advertencia al contar ${item.label}: ${err.message}`);
    }
  }
  console.log(`   Total aproximado de registros de prueba a eliminar: ${totalBusinessRows}`);

  if (totalBusinessRows === 0) {
    console.log('\nℹ️ Las tablas de negocio ya se encontraban vacías.');
  } else {
    console.log('\n🚀 3. Ejecutando eliminación en orden seguro de claves foráneas...');
  }

  // Paso 3: Eliminación en orden
  const deletedSummary: { label: string; count: number }[] = [];

  for (const item of BUSINESS_MODELS_CLEANUP_ORDER) {
    try {
      const result = await (prisma as any)[item.key].deleteMany({});
      deletedSummary.push({ label: item.label, count: result.count });
      if (result.count > 0) {
        console.log(`   🗑️  Eliminados ${result.count.toString().padStart(4)} registros de ${item.label}`);
      }
    } catch (err: any) {
      console.error(`   ❌ Error eliminando registros de ${item.label}:`, err.message);
      throw err;
    }
  }

  // Paso 4: Verificación posterior
  console.log('\n🔍 4. Verificación posterior de limpieza:');
  let anyBusinessRemaining = false;
  for (const item of BUSINESS_MODELS_CLEANUP_ORDER) {
    const remaining = await (prisma as any)[item.key].count();
    if (remaining > 0) {
      console.error(`   ❌ ERROR: ${item.label} aún contiene ${remaining} registros.`);
      anyBusinessRemaining = true;
    }
  }

  if (!anyBusinessRemaining) {
    console.log('   ✅ Todas las tablas de negocio quedaron completamente en 0 registros.');
  }

  // Paso 5: Confirmación de conservación de configuraciones
  console.log('\n🛡️  5. Confirmación de integridad de registros esenciales:');
  let allProtectedIntact = true;
  for (const item of PROTECTED_MODELS) {
    try {
      const count = await (prisma as any)[item.key].count();
      console.log(`   ✅ CONSERVADO: ${item.label.padEnd(50)} -> ${count} registros`);
    } catch (err: any) {
      console.error(`   ❌ Error verificando ${item.label}: ${err.message}`);
      allProtectedIntact = false;
    }
  }

  console.log('\n===============================================================');
  if (!anyBusinessRemaining && allProtectedIntact) {
    console.log('✨ LIMPIEZA COMPLETADA CON ÉXITO: Base de datos lista como cuenta nueva.');
  } else {
    console.log('⚠️ LIMPIEZA FINALIZADA CON ADVERTENCIAS (ver detalles arriba).');
  }
  console.log('===============================================================\n');
}

runCleanup()
  .catch((e) => {
    console.error('❌ Error fatal en el proceso de limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
