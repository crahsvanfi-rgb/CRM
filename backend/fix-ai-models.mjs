import fs from 'fs';
const f = 'src/modules/ai-chat/ai-chat.service.ts';
let content = fs.readFileSync(f, 'utf8');
content = content.replace(/aIConversation/g, 'conversation');
content = content.replace(/aIMessage/g, 'message');
fs.writeFileSync(f, content);
console.log('Fixed models in ai-chat.service.ts');
