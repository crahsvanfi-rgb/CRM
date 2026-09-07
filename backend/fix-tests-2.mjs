import fs from 'fs';

// 1. chatbot-config.controller.spec.ts
let f1 = 'src/modules/chatbot-config/chatbot-config.controller.spec.ts';
let c1 = fs.readFileSync(f1, 'utf8');
if (!c1.includes('PrismaService')) {
  c1 = "import { PrismaService } from '../../prisma/prisma.service.js';\n" + c1;
  c1 = c1.replace(/providers: \[/, "providers: [\n        { provide: PrismaService, useValue: { getTenantClient: vi.fn() } },");
  fs.writeFileSync(f1, c1);
}

// 2. zenior-webhook.service.spec.ts
let f3 = 'src/modules/zenior/zenior-webhook.service.spec.ts';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/externalChannelConfig:/g, 'channelConnection:');
fs.writeFileSync(f3, c3);

console.log('Fixed final test mocks');
