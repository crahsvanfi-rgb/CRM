import fs from 'fs';

let f = 'prisma/schema.prisma';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/usages    AIUsage\[\]\n/g, '');
c = c.replace(/model Conversation \{[\s\S]*?tenantId\]\)\n\}/g, (match) => {
  return match.replace(/tenantId\]\)\n\}/, "tenantId])\n  aiUsages AIUsage[]\n}");
});

fs.writeFileSync(f, c);
console.log('Fixed relations');
