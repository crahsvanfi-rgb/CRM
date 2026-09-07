import fs from 'fs';
const files = [
  'src/modules/automations/automation-engine.service.spec.ts',
  'src/modules/chatbot-config/chatbot-config.controller.spec.ts',
  'src/modules/conversations/conversations.service.spec.ts',
  'src/modules/recommendations/recommendation-engine.service.spec.ts',
  'src/modules/zenior/zenior-webhook.service.spec.ts'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/jest\./g, 'vi.');
  if(!content.includes('import { vi }')) {
    content = "import { vi } from 'vitest';\n" + content;
  }
  fs.writeFileSync(f, content);
});
console.log('Done');
