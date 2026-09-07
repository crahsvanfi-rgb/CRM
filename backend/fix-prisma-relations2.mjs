import fs from 'fs';

let f = 'prisma/schema.prisma';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/aiUsages AIUsage\[\]\n/g, '');

c = c.replace(/model Conversation \{([\s\S]*?)\}/, (match, p1) => {
  return `model Conversation {${p1}  aiUsages AIUsage[]\n}`;
});

fs.writeFileSync(f, c);
console.log('Fixed relations properly');
