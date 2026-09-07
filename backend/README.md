# CRM para Importadoras - Backend

Este repositorio contiene el código backend (NestJS) para el CRM SaaS Multiempresa, enfocado actualmente en la **Fase 2.4 (Módulo de Inventario)**.

## Módulo de Inventario (Fase 2.4)

El módulo de inventario permite a las empresas importadoras tener un control estricto y trazabilidad completa sobre sus existencias. Maneja el stock físico, reservado y disponible a través de un sistema de movimientos inmutables para cada producto.

### Modelos de Datos (Prisma)
- `Warehouse` (Opcional): Bodegas o almacenes de la empresa.
- `ProductStock`: Resumen rápido de existencias consolidadas por producto.
- `InventoryMovement`: Historial transaccional que documenta el tipo de operación, motivo, y recálculo de los stocks.

### Endpoints Disponibles

Todas las rutas operan bajo el prefijo `/inventory` y requieren autenticación, usando el `tenantId` provisto en el token o headers.

- `POST /inventory/movements`: Registra un nuevo movimiento manual (Ajuste, Entrada, Devolución, Salida). Valida que no queden inventarios negativos ni se crucen datos entre empresas.
- `GET /inventory/movements`: Lista el historial de movimientos de manera global o filtrado por producto (`?productId=xxx`).
- `GET /inventory/stock-summary`: Devuelve el catálogo completo de productos con sus cifras consolidadas de stock físico, reservado y disponible.
- `GET /inventory/stock/:productId`: Obtiene el stock exacto en tiempo real de un único producto.
- `POST /inventory/reserve`: Reserva stock para un futuro pedido, restando del stock "disponible" pero manteniendo el "físico" intacto.
- `POST /inventory/release`: Libera una reserva previa devolviendo el saldo al stock "disponible".

## Módulo de Cotizaciones (Fase 2.5)

El módulo de cotizaciones permite a los vendedores generar presupuestos precisos en formato PDF, calculando automáticamente subtotales, descuentos e impuestos, y facilitando su posterior conversión a pedido.

### Modelos de Datos (Prisma)
- `Quote`: Cabecera de la cotización con información financiera y de cliente.
- `QuoteItem`: Detalle de los productos cotizados con precios unitarios y descuentos.
- `Order` / `OrderItem`: Modelos base para la conversión final a pedido firme.

### Endpoints Disponibles (Prefijo `/quotes`)
- `POST /`: Crea una nueva cotización en estado BORRADOR.
- `GET /`: Listado paginado de cotizaciones con soporte para búsqueda y filtrado por estado.
- `GET /:id`: Obtiene el detalle de una cotización y sus ítems.
- `PATCH /:id`: Permite modificar una cotización (solo si está en BORRADOR o ENVIADA).
- `DELETE /:id`: Elimina la cotización y sus ítems (solo si no está ACEPTADA).
- `POST /:id/send`: Cambia el estado a ENVIADA.
- `POST /:id/accept`: Cambia el estado a ACEPTADA.
- `POST /:id/reject`: Cambia el estado a RECHAZADA.
- `POST /:id/duplicate`: Clona la cotización generando un nuevo número correlativo.
- `POST /:id/convert-to-order`: Convierte la cotización en un pedido firme.
- `GET /:id/pdf`: Genera y descarga el documento PDF de la cotización.

### Comandos de Migración

Antes de iniciar el servicio por primera vez para este módulo, debes aplicar el esquema de la base de datos:

```bash
# Para la Fase 2.4 (Inventario)
npx prisma migrate dev --name add_inventory_models

# Para la Fase 2.5 (Cotizaciones)
npx prisma migrate dev --name add_quote_models
```

### Ejecutar Pruebas

Para garantizar que el aislamiento multitenant y las lógicas de negocio funcionan correctamente, ejecuta las pruebas:

```bash
# Pruebas Unitarias
npm run test

# Pruebas End-to-End (E2E)
npm run test:e2e
```

### Variables de Entorno

El sistema necesita las siguientes variables definidas en un archivo `.env` en la raíz del proyecto backend:

```env
# URL de Conexión a PostgreSQL (Supabase o Local)
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Puerto en el que corre el servidor de NestJS
PORT=3000

# Secreto de Supabase Auth o JWT (según implementación)
SUPABASE_JWT_SECRET="your_secret_here"
```

## Fase 2.11: Pruebas de Integración y Estabilización (COMPLETADA)
Se implementó y ejecutó una suite de pruebas End-to-End (`test/integration.e2e-spec.ts`) que abarca 13 flujos comerciales y logísticos completos.
**Flujos Validados:**
- Lead → Cliente → Cotización → Pedido → Reserva → Salida.
- Importación → Producto → Transiciones de Estado → Entrada.
- Actividades de seguimiento para Leads y Clientes.
- Métricas Reales en Dashboard y Reportes.
- Aislamiento Multitenant estricto (Tenant A vs Tenant B).

**Deuda Técnica Pendiente (No implementada por reglas de MVP):**
1. **Stock en Tránsito:** La lógica actual de transiciones de Importaciones (ej. a `EN_TRANSITO`) no reserva/incrementa el campo `stockTransito` en `ProductStock`.
2. **AuditLog:** El modelo `AuditLog` existe en Prisma pero no tiene lógica de aplicación activa en los controladores o servicios.

## Módulo de Pedidos (Fase 2.6)

El módulo de pedidos gestiona el ciclo completo desde la creación del pedido (manual o por conversión) hasta su entrega o cancelación. Tiene integración en tiempo real con el inventario para efectuar las reservas de stock y las descargas físicas correspondientes.

### Modelos de Datos (Prisma)
- `Order`: Cabecera del pedido que incluye fecha esperada, observaciones, y control de estado (`PENDIENTE`, `CONFIRMADO`, `PREPARANDO`, `LISTO`, `ENTREGADO`, `CANCELADO`).
- `OrderItem`: Detalle de los productos pedidos con cantidad, precio y descuento.

### Endpoints Disponibles (Prefijo `/orders`)
- `POST /`: Crea un nuevo pedido manualmente.
- `GET /`: Lista los pedidos paginados con soporte para búsqueda y filtrado por estado, cliente, vendedor y rango de fechas.
- `GET /:id`: Obtiene el detalle de un pedido específico.
- `PATCH /:id`: Modifica la información del pedido y sus ítems (solo permitido antes de confirmar).
- `DELETE /:id`: Realiza un borrado lógico del pedido.
- `POST /:id/confirm`: Confirma el pedido y reserva stock automáticamente en el inventario.
- `POST /:id/cancel`: Cancela el pedido y libera las reservas de stock correspondientes.
- `POST /:id/deliver`: Marca el pedido como entregado, libera la reserva y genera la salida de inventario oficial.
- `GET /:id/pdf`: Genera y descarga un comprobante de pedido en formato PDF.

### Comandos de Migración
Para la Fase 2.6 (Pedidos), aplica los cambios en el esquema:

```bash
npx prisma migrate dev --name expand_order_models
```

## Módulo de Agenda y Actividades (Fase 2.8)

Este módulo permite a los usuarios gestionar su tiempo y dar seguimiento comercial mediante actividades programadas (llamadas, reuniones, tareas, etc.) asociadas a clientes o leads, todo dentro del contexto multiempresa.

### Modelos de Datos (Prisma)
- `Activity`: Actividad programada con título, descripción, fechas, estado (`PENDIENTE`, `COMPLETADA`, `CANCELADA`) y el responsable asignado. Se relaciona opcionalmente con un cliente o lead.

### Endpoints Disponibles (Prefijo `/activities`)
- `POST /`: Crea una nueva actividad validando que cliente y lead no se crucen.
- `GET /`: Lista las actividades paginadas con soporte para búsqueda y filtrado por estado, tipo, responsable y rango de fechas.
- `GET /calendar`: Devuelve las actividades en un rango de fechas para vistas de calendario.
- `GET /history`: Muestra el historial de actividades completadas o canceladas.
- `GET /:id`: Obtiene el detalle de una actividad específica.
- `PATCH /:id`: Modifica la información de la actividad (no permitido si está cancelada o completada).
- `DELETE /:id`: Realiza un borrado lógico de la actividad.
- `POST /:id/complete`: Marca la actividad como completada, registrando la fecha.
- `POST /:id/cancel`: Cancela la actividad.

### Comandos de Migración
Para la Fase 2.8 (Agenda y Actividades), aplica los cambios en el esquema:

```bash
npx prisma migrate dev --name add_activity_models
```

## Módulo de Reportes Básicos (Fase 2.10)

Este módulo proporciona información gerencial y operativa de la empresa mediante agregaciones a nivel de base de datos de manera aislada por tenant. Soporta filtros de fecha y exportación a CSV.

### Endpoints Disponibles (Prefijo `/reports`)
- `GET /sales-by-period`: Ventas totales y número de pedidos.
- `GET /sales-by-vendor`: Ventas agrupadas por vendedor.
- `GET /sales-by-customer`: Ventas agrupadas por cliente.
- `GET /top-products`: Productos con mayor cantidad vendida.
- `GET /least-products`: Productos con menor rotación.
- `GET /stock-summary`: Estado en tiempo real del inventario físico y reservas (No requiere fechas).
- `GET /leads`: Estadísticas de leads por estado y fuente.
- `GET /lead-conversion`: Tasa de conversión de leads a clientes.
- `GET /new-customers`: Clientes recientes y vendedores asignados.
- `GET /inactive-customers`: Clientes inactivos (parámetro opcional `diasInactivo`).
- `GET /importations`: Resumen logístico y financiero de importaciones.

### Exportación a CSV
En el frontend (Next.js), cada vista de reporte incorpora un botón de "Exportar CSV" que toma automáticamente los datos renderizados (filas y columnas mostradas en pantalla) y genera la descarga del archivo formateado sin requerir un procesamiento adicional de backend.

### Comandos de Migración
Para la Fase 2.10 (Reportes), **no se requieren migraciones a la base de datos**. Las agregaciones se calculan sobre los modelos y transacciones implementadas en las fases anteriores (Pedidos, Entregas, Inventario).

## Módulo Dashboard (Fase 2.9)

El Dashboard actúa como la página principal de entrada al CRM, proporcionando un resumen visual y analítico en tiempo real de toda la operación (Ventas, Clientes, Inventario, Logística y Seguimientos).

### Endpoints Disponibles
- `GET /dashboard/summary`: Retorna un objeto consolidado con todas las métricas operativas del mes en curso y alertas. Acepta opcionalmente `fechaInicio` y `fechaFin` para filtrar las métricas históricas.

### Seguridad y Aislamiento
Toda la data del dashboard se procesa estrictamente respetando el aislamiento multitenant. Las consultas masivas (`aggregate`, `count`, `groupBy`) se ejecutan contra el contexto particular del `tenantId` inyectado mediante `x-tenant-id` o JWT, sin cruce de información.

### Comandos de Migración
Para la Fase 2.9 (Dashboard), **no se requieren migraciones a la base de datos**. Al igual que el módulo de reportes, se consolida la información transaccional ya existente.

## Módulo Agente IA Interno (Fase 3.2)

El Agente IA interno permite a los usuarios del CRM realizar preguntas en lenguaje natural obteniendo respuestas basadas en los datos reales del Tenant mediante la tecnología de "Function Calling" provista por OpenRouter.

### Modelos de Datos (Prisma)
- `AIConversation`: Representa un hilo de conversación de chat.
- `AIMessage`: Cada uno de los mensajes (rol `USER`, `ASSISTANT`, `SYSTEM`) de la conversación.
- `AIUsageLog`: Tabla de auditoría para guardar el modelo usado, tokens consumidos y estado de la interacción.

### Endpoints Disponibles (Prefijo `/ai-chat/conversations`)
- `POST /`: Crea una nueva conversación.
- `GET /`: Lista las conversaciones del usuario autenticado (paginado).
- `GET /:id`: Obtiene el hilo completo de la conversación y sus mensajes.
- `PATCH /:id`: Permite renombrar el título de la conversación.
- `DELETE /:id`: Elimina (oculta lógicamente) la conversación.
- `POST /:id/messages`: Recibe un texto, inyecta llamadas a OpenRouter, invoca las Tools necesarias y retorna la respuesta procesada. **Posee un Rate Limiting estricto por usuario y tenant.**

### Herramientas Controladas (Tools) - Ampliadas en Fase 3.3
El agente expone 19 herramientas a la Inteligencia Artificial de forma segura (aislamiento de BD y controles RBAC):

**Ventas y Logística:**
1. `getSalesSummary`: Ventas globales (Solo Admin/Gerente).
2. `getLowStockProducts`: Productos con bajo stock.
3. `getPendingOrders`: Pedidos pendientes de despacho.
4. `getImportations`: Listado de importaciones activas (Solo Admin/Gerente).
5. `getProductStock`: Detalle desglosado de stock de un producto.
6. `getQuotes`: Listado de cotizaciones por estado.
7. `getActivities`: Tareas y seguimientos de la agenda.

**Consultas Inteligentes de Clientes (Fase 3.3):**
8. `searchCustomerByName`: Búsqueda de clientes por nombre.
9. `searchCustomerByNIT`: Búsqueda de clientes por NIT exacto.
10. `getCustomerSalesInfo`: Ventas acumuladas de un cliente específico. (Requiere Admin/Gerente).
11. `getCustomerQuotes`: Historial de cotizaciones de un cliente.
12. `getCustomerOrders`: Historial de pedidos de un cliente.
13. `getCustomerActivities`: Actividades y tareas de un cliente.
14. `getCustomerSummary`: Resumen 360 del cliente con reglas de recomendación (ej. reactivación o seguimiento).
15. `getCustomerInformation`: Detalle de ventas y última compra de un cliente.
16. `getInactiveCustomers`: Clientes sin actividad de compra reciente.
17. `detectFrequentCustomers`: Clientes con mayor volumen de transacciones (rotación).
18. `detectHighValueCustomers`: Clientes VIP con mayor facturación total (Pareto).
19. `recommendFollowUpCustomers`: Motor de recomendación proactiva para seguimiento comercial.

**Inteligencia de Inventario (Fase 3.4):**
20. `getInventorySummary`: Resumen de stock físico, reservado, disponible y en tránsito. (Solo Admin/Gerente).
21. `getStockByProduct`: Stock desglosado de un producto por nombre o SKU.
22. `getLowStockProducts`: Productos con stock disponible <= stock mínimo.
23. `getOutOfStockProducts`: Productos con stock disponible = 0.
24. `getProductsInTransit`: Productos asociados a importaciones EN_TRANSITO o ADUANA. (Solo Admin/Gerente).
25. `getHighRotationProducts`: Productos más vendidos en un periodo. (Solo Admin/Gerente).
26. `getLowRotationProducts`: Productos menos vendidos en un periodo. (Solo Admin/Gerente).
27. `compareSalesVsInventory`: Ratio de ventas vs inventario para detectar exceso o falta de stock. (Solo Admin/Gerente).
28. `recommendReorderProducts`: Sugerencias automatizadas de reimportación según rotación y stock. (Solo Admin/Gerente).
29. `getStockRiskProducts`: Productos en riesgo de agotarse rápido (<= 20% del stock mínimo). (Solo Admin/Gerente).

**Análisis Inteligente de Ventas (Fase 3.5):**
30. `getSalesSummary`: Resumen general de ventas y ticket promedio con comparativa temporal. (Solo Admin/Gerente).
31. `getSalesByPeriod`: Ventas totales y cantidad de pedidos en un rango de fechas. (Solo Admin/Gerente).
32. `getSalesByVendor`: Ventas agrupadas por vendedor y ticket promedio. (Vendedores solo ven sus datos).
33. `getSalesByCustomer`: Ventas agrupadas por cliente. (Vendedores solo ven a sus clientes).
34. `getSalesByProduct`: Ventas consolidadas por producto. (Solo Admin/Gerente).
35. `getTopProducts` / `getLeastProducts`: Top productos más y menos vendidos. (Solo Admin/Gerente).
36. `getTopCustomers`: Clientes principales por monto facturado. (Solo Admin/Gerente).
37. `getAverageTicket`: Ticket promedio general o por vendedor. (Vendedores solo ven sus datos).
38. `getSalesTrend`: Serie temporal y detección de tendencias (creciente/decreciente). (Solo Admin/Gerente).
39. `getQuoteConversion`: Tasa de conversión de cotizaciones a pedidos. (Solo Admin/Gerente).
40. `getCommercialRecommendations`: Generación de recomendaciones accionables (clientes VIP inactivos, cotizaciones pendientes, promociones). (Solo Admin/Gerente).
### Comandos de Migración
Para habilitar los modelos de la Fase 3.2, aplica:

```bash
npx prisma migrate dev --name add_ai_chat_models
```

### Limitaciones de Uso
- **Seguridad:** Ninguna herramienta recibe SQL del modelo.
- **Cuota:** Existe un límite configurado de peticiones (`rate limiting`) para evitar abusos de la facturación en OpenRouter. Enviar más de 10 mensajes por minuto arrojará error HTTP 429.

## Motor de Recomendaciones (Fase 3.6)

El Motor de Recomendaciones genera alertas proactivas evaluando múltiples reglas de negocio cada noche mediante un proceso automatizado (cron job). Estas recomendaciones están centralizadas y expuestas de forma global en el Panel de Control (Dashboard) y en el Agente IA.

### Modelos de Datos (Prisma)
- `Recommendation`: Almacena alertas accionables con su tipo, severidad (BAJA, MEDIA, ALTA, CRITICA) y el ID de la entidad relacionada.

### Reglas de Negocio Implementadas
- **Clientes Inactivos:** Clientes sin compras entregadas en 60 días.
- **Cotizaciones sin respuesta:** Cotizaciones en estado ENVIADA sin interacción en 7 días.
- **Bajo Stock:** Productos cuyo stock disponible cayó debajo del límite mínimo.
- **Potencial de Recompra:** Clientes recurrentes (>2 pedidos) sin compras en 90 días.
- **Actividades Vencidas:** Tareas o eventos pendientes de fechas anteriores.

### Endpoints Disponibles (Prefijo `/recommendations`)
- `GET /`: Listado paginado y filtrado de todas las recomendaciones.
- `GET /active`: Listado priorizado por severidad (Solo para visualización gerencial).
- `POST /generate`: Disparador manual para generar las recomendaciones bajo demanda.
- `PATCH /:id`: Actualiza el estado (ej. cambiar a RESUELTA).
- `DELETE /:id`: Descarta (soft-delete) la recomendación.

### Integración con AI
- Se habilitó la nueva herramienta `getActiveRecommendations` para que el Agente IA pueda contestar de inmediato cuáles son las tareas urgentes o anomalías críticas del sistema.

### Comandos de Migración
Para habilitar los modelos de la Fase 3.6, aplica:

```bash
npx prisma migrate dev --name add_recommendations
```

## Motor de Automatizaciones (Fase 3.7)

El Módulo de Automatizaciones permite crear flujos automáticos simples basados en el patrón Evento → Condición → Acción, sin depender de plataformas externas.

### Modelos de Datos (Prisma)
- `Automation`: Define la regla con su evento disparador, condiciones (JSON dinámico) y acción.
- `AutomationExecution`: Registro del historial de ejecuciones con manejo de estados (`EXITOSO`, `ERROR`) para depuración y transparencia.

### Eventos Soportados
- `COTIZACION_SIN_RESPUESTA`: Cotización en estado "Enviada" sin actualización reciente.
- `STOCK_BAJO`: Producto alcanza su stock mínimo.
- `PEDIDO_ATRASADO`: Pedido que no fue despachado o entregado pasada su fecha esperada.
- `CLIENTE_INACTIVO`: Cliente sin compras en un rango prolongado de tiempo.
- `ACTIVIDAD_VENCIDA`: Tarea de seguimiento pasada de fecha.

### Acciones Soportadas
- `CREAR_ACTIVIDAD`: Programa una tarea en la agenda del responsable.
- `GENERAR_ALERTA`: Crea una alerta visual en el Motor de Recomendaciones (Dashboard).
- `ENVIAR_NOTIFICACION`: Registra un evento en el log interno silencioso.

### Seguridad y Ejecución
- Protegido para Administradores y Gerentes a través de RBAC.
- Utiliza `@nestjs/schedule` para ejecutar un Cron Job horario validando la **idempotencia** mediante el registro previo exitoso sobre una `entidadRef` única (ej. no se notifica 2 veces a la misma cotización).

### Comandos de Migración
Para habilitar la Fase 3.7, ejecuta:
```bash
npx prisma migrate dev --name add_automations
```

## Integración con Zenior (Fase 3.8)

Permite que el Agente IA interactúe automáticamente con clientes a través de canales externos (e.g. Facebook/Meta Messenger) utilizando Zenior como pasarela.

### Modelos de Datos (Prisma)
- `ExternalChannelConfig`: Guarda configuración y credenciales cifradas (Tokens, Page IDs, Verify Tokens) por tenant.
- `ExternalConversation`: Mantiene el registro y asociación del cliente de Facebook (`contactoId`) con un hilo conversacional interno.
- `ExternalMessage`: Historial atómico de mensajes entrantes y salientes, controlando el estado de envío.

### Endpoints
- `GET /external-channels`: Lista las integraciones configuradas.
- `PUT /external-channels/zenior`: Actualiza o crea la configuración (cifrando automáticamente tokens sensibles).
- `POST /external-channels/zenior/test`: Prueba de conexión saliente simulada.
- `GET /webhooks/zenior`: Endpoint público que procesa el **Challenge** (`hub.challenge`) requerido por Meta para verificar el `verify_token` configurado.
- `POST /webhooks/zenior`: Endpoint público que recibe los eventos entrantes. Responde HTTP 200 de inmediato y asincrónicamente delega al Agente IA para generar e inyectar la respuesta de vuelta a Zenior.
- `GET /external-channels/conversations`: Historial de conversaciones activas por tenant.
- `GET /external-channels/conversations/:id/messages`: Chat log de una conversación.

### Comandos de Migración
Para aplicar los nuevos modelos en la Fase 3.8, ejecuta:
npx prisma migrate dev --name add_external_channels
```

## Configuración Avanzada de Chatbot (Fase 3.9)

Permite la configuración detallada del agente IA externo asignado a cada tenant (usado mediante Zenior u otros webhooks).

### Modelos de Datos (Prisma)
- `ChatbotConfig`: Almacena la configuración general, horario de atención, reglas, prompt del sistema, permisos granulares de herramientas y mensajes por defecto.

### Endpoints (Prefijo `/chatbot-config`)
- `GET /`: Devuelve la configuración actual.
- `PUT /`: Crea o actualiza la configuración.
- `POST /test`: Prueba la configuración con un mensaje interactivo, ignorando las restricciones de horario.
- `PATCH /activate`: Activa o desactiva rápidamente el chatbot.
- `DELETE /`: Restablece los valores por defecto.

### Funcionalidades Clave
- **Permisos de Tools:** Intercepta la llamada a OpenRouter y filtra el catálogo de `tools` disponibles según las capacidades habilitadas (`consultarStock`, `capturarLeads`, etc).
- **Control de Horario:** Responde con un mensaje predefinido ("Fuera de horario") si el webhook recibe un mensaje fuera de los parámetros configurados.

### Comandos de Migración
Para habilitar la Fase 3.9, ejecuta:
npx prisma migrate dev --name add_chatbot_config
```

## Bandeja de Mensajes - Conversaciones (Fase 3.10)

Módulo que centraliza y unifica todas las conversaciones (mensajes entrantes y salientes) de los diferentes canales externos (Zenior, Meta, Web, WhatsApp). Permite la transición fluida (Hand-off) entre el Bot IA y un Asesor Humano.

### Modelos de Datos (Prisma)
- `Conversation`: Reemplaza a `ExternalConversation`. Almacena la cabecera de la conversación, identificando su estado (`NO_LEIDA`, `ABIERTA`, `PENDIENTE`, `CERRADA`), asesor asignado, y vinculaciones con `Lead` y `Customer`.
- `ConversationMessage`: Reemplaza a `ExternalMessage`. Almacena cada mensaje con soporte para indicar si fue emitido por `CLIENTE`, `BOT` o `HUMANO`, además de soportar adjuntos (`urlAdjunto`, `tipoContenido`).

### Endpoints Disponibles (Prefijo `/conversations`)
- `GET /`: Listado paginado de conversaciones. Soporta filtros por estado y texto. Respeta RBAC (Los vendedores solo ven las suyas).
- `GET /:id/messages`: Obtiene el historial del chat.
- `POST /:id/messages`: Envía un mensaje manual (Humano) y lo sincroniza con el canal externo.
- `POST /:id/transfer-to-human`: Asigna un asesor y pausa la IA.
- `POST /:id/transfer-to-bot`: Libera el asesor y reanuda el control de IA.
- `POST /:id/create-lead`: Crea rápidamente un Lead en el CRM usando los datos de la conversación.
- `POST /:id/mark-read`: Marca los mensajes como leídos.
- `POST /:id/attachments`: Sube archivos a Supabase Storage y los envía.

### Lógica de Hand-off (Webhook)
El servicio `ZeniorWebhookService` intercepta los mensajes. Si la conversación está `ABIERTA` (con un humano asignado), la IA ignora el mensaje. Si está `NO_LEIDA` o `PENDIENTE`, la IA interviene y responde automáticamente.

### Comandos de Migración
Para habilitar la Fase 3.10, ejecuta:
```bash
npx prisma migrate dev --name add_conversations
```

## Control Bot + Humano (Fase 3.11)

Mecanismo explícito para intercambiar el control de una conversación entre el Agente IA y un Asesor Humano.

### Lógica
- El modelo `Conversation` incluye un campo `modo` (`IA` o `HUMANO`).
- Cuando un humano toma el control usando `POST /conversations/:id/take-control`, la conversación pasa a modo `HUMANO`. El sistema registra quién tomó el control y en qué fecha (`tomadoPorId`, `fechaToma`).
- Durante el modo `HUMANO`, los mensajes entrantes (webhook) no disparan a la IA.
- El asesor puede devolver la conversación al bot mediante `POST /conversations/:id/return-to-bot`, lo que cambia el modo a `IA` y registra la `fechaDevolucion`.

### Comandos de Migración
Para habilitar la Fase 3.11, ejecuta:
```bash
npx prisma migrate dev --name add_conversation_mode
```

## Audios: Recepción y Transcripción (Fase 3.12)

Integración para la recepción, almacenamiento y transcripción asíncrona de notas de voz enviadas por los clientes a través de los canales externos.

### Componentes Principales
- **Base de Datos**: Se expandió `ConversationMessage` para soportar estados de transcripción (`PENDIENTE`, `COMPLETADA`, `ERROR`, `NO_REQUERIDA`) y almacenar el texto en `transcripcion`.
- **Recepción en Webhook (`zenior-webhook.service.ts`)**: Detecta adjuntos de tipo audio, simula la subida al Storage, guarda el mensaje y dispara la transcripción de fondo.
- **AudioTranscriptionService**: Simula la llamada a una API de Speech-To-Text (e.g. OpenAI Whisper). Tras 3 segundos de procesamiento simulado, actualiza el mensaje con el texto transcrito. Si la conversación está en Modo IA, alimenta el texto al `AiChatService` para que el bot responda al audio como si fuera texto.
- **UI de Conversaciones**: Los mensajes de audio muestran un reproductor nativo `<audio controls />`. Debajo del reproductor, un indicador reactivo muestra si está "Transcribiendo... ⏳" y luego muestra el bloque de texto con la transcripción completa, o permite reintentar si ocurre un error.

### Comandos de Migración
Para habilitar la Fase 3.12, ejecuta:
```bash
npx prisma migrate dev --name add_audio_fields
```

## Consolidación del Modelo de Datos (Fase 3.13)

En esta fase se consolidó y normalizó el esquema de base de datos para todas las funcionalidades de canales externos y mensajería, eliminando redundancias sin alterar el comportamiento.

### Cambios Principales
- `ExternalChannelConfig` fue renombrado a `ChannelConnection`.
- `ConversationMessage` fue renombrado a `Message`.
- `AIUsageLog` fue renombrado a `AIUsage`.
- Se introdujo el modelo `MessageAttachment`.
- Refactorización de servicios y UI para soportar la nomenclatura unificada (`senderType`, `direction`, `content`, `status`, etc).

## Fase 4: Marketing y Campañas Avanzadas (Bloque 4.15 a 4.20)

Módulo integral de campañas automáticas y manuales para reactivación comercial, ventas cruzadas y conversión con soporte multitenant, auditoría y RBAC estricto.

### 4.15 Campaña → Cliente (Vinculación y Actividad)
- Cuando un destinatario responde a una campaña (`POST /campaigns/:id/process-response`), el sistema ejecuta una transacción atómica:
  - Si el contacto ya existe como **Cliente** en la empresa (por ID o número de teléfono/WhatsApp), genera automáticamente una **Actividad de Seguimiento** asignada a su vendedor responsable.
  - Vincula `clienteVinculadoId` y `actividadGeneradaId` al destinatario e incrementa `totalClientesVinculados` y `totalActividadesGeneradas` en la campaña.
  - Si el contacto **NO existe como Cliente**, crea automáticamente un nuevo **Lead** en estado `NUEVO` con fuente `Campaña: [Nombre]`, asociándolo a `leadGeneradoId` e incrementando `totalLeads` y `totalLeadsGenerados`.

### 4.16 Campañas Automáticas Activadas por Eventos
- Soporte para disparadores (`CampaignTrigger`):
  - `CLIENTE_INACTIVO`: Detección periódica de clientes sin compras recientes.
  - `NUEVO_PRODUCTO`: Ofertas automáticas a clientes con histórico de compra.
  - `IMPORTACION_RECIBIDA`: Estructura preparada para notificación de arribos.
  - `COTIZACION_SIN_RESPUESTA`: Estructura preparada para reactivación de presupuestos.
- Servicio `CampaignsAutomationService` ejecutado cada hora mediante `@Cron(CronExpression.EVERY_HOUR)` para evaluar campañas con `activaAutomatica: true` y generar mensajes pendientes.

### 4.17 Recuperación de Clientes Inactivos con Priorización IA
- `POST /campaigns/auto/recover-inactive`:
  - **Parámetros**: `diasInactivo` (número, ej: 90), `priorizarConIA` (booleano opcional), `nombre`, `canal`.
  - Identifica todos los clientes cuya última orden sea anterior al límite temporal.
  - Si `priorizarConIA: true`, analiza el historial en OpenRouter (`openai/gpt-4o-mini`) para clasificar a los destinatarios en prioridad `ALTA`, `MEDIA` o `BAJA`. En caso de desconexión o falta de API Key, activa un fallback determinista RFM (volumen de compra y frecuencia de pedidos).
  - Genera automáticamente el `Segment` y la `Campaign` con sus respectivos `CampaignRecipient`.

### 4.18 Campañas por Productos
- `POST /campaigns/auto/product`:
  - **Parámetros**: `productoId` (UUID), `nombre`, `canal`.
  - Filtra en la tabla `OrderItem` a los clientes que hayan comprado el producto en órdenes con estado `ENTREGADO`.
  - Deduplica clientes, crea el segmento y la campaña vinculando el `productoInteresId`.

### 4.19 Campañas por Vendedor (RBAC)
- `POST /campaigns/auto/vendor`:
  - **Parámetros**: `vendedorId` (UUID), `nombre`, `canal`.
  - **Control de Acceso (RBAC)**: Un usuario con rol `Vendedor` solo puede generar campañas para su propio `userId`. Los administradores y gerentes pueden seleccionar cualquier vendedor de la empresa.
  - Asigna automáticamente a todos los clientes activos de dicha cartera.

### 4.20 Bandeja de Campañas y Frontend Next.js
- `GET /campaigns/board`:
  - Métricas agregadas por campaña: `totalDestinatarios`, `totalEnviados`, `totalEntregados`, `totalRespuestas`, `totalLeads`, `totalLeadsGenerados`, `totalClientesVinculados`, `totalActividadesGeneradas`.
  - Soporta filtros combinados por `estado`, `tipo`, `canal`, `search` y paginación (`page`, `limit`).
  - Restringe la visibilidad de los vendedores únicamente a sus propias campañas (`responsableId` o `vendedorObjetivoId`).
- **UI en Next.js**:
  - `/dashboard/marketing/campaigns/board`: Tabla interactiva con badges de estado y tipo, métricas KPI globales, filtros y modales para creación automática (Recuperar inactivos, por producto, por vendedor) y simulación de respuesta.
  - `/dashboard/marketing/campaigns/[id]`: Vista de detalle con 4 pestañas operativas: **Resumen**, **Destinatarios** (con prioridades y estado de respuesta), **Conversiones** (leads y clientes vinculados) y **Configuración** (velocidad y control de envíos).
  - `/dashboard/marketing/campaigns/create`: Formulario de creación de campañas manuales.

### 4.21 Configuración General de Campañas por Tenant (`/campaign-config`)
- Modelo `CampaignConfig`:
  - `campanasActivas`: Switch maestro para pausar o reanudar todos los envíos del tenant.
  - `limiteMensajesPorDia` y `limiteMensajesPorHora`: Topes operativos de envío para evitar baneos o saturación.
  - `horarioPermitidoInicio` y `horarioPermitidoFin`: Ventana horaria permitida para despacho de mensajes (formato HH:mm).
  - `costoPorMensajeWhatsapp` y `costoPorMensajeSms`: Tarifas unitarias configurables por tenant en USD.
  - `mensajePredeterminado` y `firma`: Plantilla por defecto y firma corporativa predeterminada.
- Endpoints:
  - `GET /campaign-config`: Obtiene o inicializa la configuración del tenant actual.
  - `PUT /campaign-config`: Actualiza límites, horarios, costos y firmas (Requiere rol Admin o Gerente).
  - `PATCH /campaign-config/toggle`: Activa o desactiva de forma inmediata el switch global de campañas.

### 4.22 Gestión de Consentimiento y Cumplimiento (`/consent`)
- Modelo `Consent`:
  - `estado`: `CONSENTIDO`, `NO_CONSENTIDO`, `PENDIENTE`.
  - `canal`, `origen` (ej: FORMULARIO_WEB, CHAT, CONTRATO), `ipOrigen`, `observaciones`.
  - Auditoría de fecha de consentimiento y fuente.
- Endpoints:
  - `POST /consent`: Registra o actualiza el consentimiento explícito de un contacto.
  - `GET /consent/status/:contactoId`: Consulta si el contacto cuenta con consentimiento activo (`hasConsent`).

### 4.23 Lista de Exclusión ("No Contactar" / Opt-Out) (`/opt-out`)
- Modelo `OptOut`:
  - Registra contactos o números telefónicos marcados para nunca contactar (`contactoId`, `telefono`, `motivo`, `fechaExclusion`).
  - Sincronización automática: al registrar un Opt-Out, su estado en `Consent` pasa inmediatamente a `NO_CONSENTIDO`.
  - Filtrado estricto en cola y asignación: Al agregar destinatarios a una campaña o al despachar en la cola de envíos (`CampaignsQueueService`), cualquier contacto presente en `OptOut` o sin consentimiento es omitido y contabilizado como `excluidosPorOptOut`.
- Endpoints:
  - `POST /opt-out`: Agrega un contacto a la lista de exclusión.
  - `GET /opt-out`: Lista paginada con buscador por nombre, teléfono o motivo.
  - `DELETE /opt-out/:contactoId`: Rehabilita el contacto eliminándolo de la lista de exclusión.

### 4.24 Control y Cálculo de Costos de Campaña (`/campaigns/:id/costs`)
- Modelo `CampaignCost` y campo `Campaign.costoTotal`:
  - Registro de auditoría de costos por campaña con desglose por canal, costo unitario, cantidad de mensajes y costo total.
  - Integrado con la configuración de tarifas del tenant (`CampaignConfig`).
- Endpoints:
  - `POST /campaigns/:id/costs/calculate`: Calcula y persiste el costo total y registro detallado en base a mensajes enviados y tarifas vigentes.
  - `GET /campaigns/:id/costs`: Retorna el costo total, resumen y desglose histórico de costos de la campaña.

### Interfaces de Usuario Next.js Implementadas (4.21 - 4.24)
- `/dashboard/configuracion/campaigns`: Panel maestro de configuración de campañas por tenant (switches, límites diarios/horarios, franjas horarias, tarifas por mensaje y firma).
- `/dashboard/marketing/no-contactar`: Lista de exclusión ("No Contactar") con búsqueda en tiempo real, modal de alta y acción de rehabilitación.
- `/dashboard/marketing/campaigns/[id]`: Pestaña dedicada **Costos y Presupuesto** con tarjetas KPI de costo total, tarifa unitaria estimada, botón de recalcular y tabla de desglose.

### 4.25 Roles y Permisos para Campañas
- **Administrador**: Acceso irrestricto a creación, edición, aprobación, programación, inicio, pausa, cancelación, eliminación, configuración y análisis de costos.
- **Supervisor/Gerente**: Crear, programar, aprobar, iniciar y ver estadísticas de campañas.
- **Vendedor**: Crear campañas exclusivamente para sus clientes asignados (`vendedorId == userId`); no puede aprobar campañas ajenas ni modificar la configuración global del tenant.
- **Usuario Básico / Lector**: Acceso de solo lectura para consultar campañas y métricas (bloqueado para crear, editar, enviar, programar o aprobar).
- Control de roles aplicado transversalmente en `CampaignsController`, `SegmentsController`, `TemplatesController` y `CampaignConfigController`.

### 4.26 Auditoría de Acciones de Campañas
- Registro en `AuditLog` de todas las operaciones mutacionales sobre campañas:
  - `CAMPAIGN_CREATED`, `CAMPAIGN_UPDATED`, `CAMPAIGN_APPROVED`, `CAMPAIGN_SCHEDULED`, `CAMPAIGN_STARTED`, `CAMPAIGN_PAUSED`, `CAMPAIGN_RESUMED`, `CAMPAIGN_CANCELLED`, `CAMPAIGN_DELETED`.
- Captura precisa del identificador de usuario (`userId`), tenant y snapshot de parámetros en el momento de la ejecución.

### 4.27 Consolidación de Entidades de Base de Datos
- Nuevos modelos Prisma añadidos y relacionados:
  - `CampaignExecution`: Historial de ejecuciones y batches de envío con contadores (`totalDestinatarios`, `totalEnviados`, `totalFallidos`) y estados (`INICIADA`, `COMPLETADA`, `FALLIDA`).
  - `CampaignEvent`: Registro de interacciones (`APERTURA`, `CLIC`, `RESPUESTA`, `REBOTE`, `OPT_OUT`) con relación directa a `Campaign` y `CampaignRecipient`.

### 4.28 Dashboard de Marketing en el Dashboard Principal
- Endpoint `GET /dashboard/marketing-summary`:
  - `campanasActivas`, `campanasProgramadas`, `mensajesEnviados`, `respuestas`, `leadsGenerados`, `clientesReactivados`, `tasaRespuestaGlobal`, `costoTotalMarketing` y `campanaConMejorRendimiento`.
- Sección visual en Next.js (`src/app/dashboard/page.tsx`):
  - Tarjetas de resumen ejecutivo de marketing.
  - Tarjeta destacada con la campaña de mejor desempeño y acceso directo al detalle.

### 4.29 Inteligencia Artificial para Análisis de Campañas
- 3 nuevas herramientas registradas en `AiToolsService`:
  - `getCampaignPerformance`: Métricas y KPIs consolidados por campaña, filtrables por estado y canal.
  - `getBestCampaign`: Identifica la campaña de mayor impacto y sugiere si repetirla con recomendaciones estratégicas.
  - `getUnresponsiveCustomers`: Detecta clientes contactados que no han respondido para activar seguimiento comercial directo.

### 4.30 Pruebas Finales Integrales de la Fase 4
```bash
# Pruebas End-to-End de Cierre de Fase 4 (4.25 - 4.30)
npx vitest run test/campaigns-closure-fase4.e2e.spec.ts

# Batería completa de pruebas de todo el CRM (31 suites, 128 pruebas pasando al 100%)
npx vitest run

# Compilación de producción NestJS
npx nest build
```




