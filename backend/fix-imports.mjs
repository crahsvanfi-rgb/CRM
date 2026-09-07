import fs from 'fs';

// 1. chatbot-config.controller.spec.ts
let f1 = 'src/modules/chatbot-config/chatbot-config.controller.spec.ts';
let c1 = fs.readFileSync(f1, 'utf8');
if (c1.includes("import('@nestjs/core').Reflector")) {
  c1 = "import { Reflector } from '@nestjs/core';\n" + c1;
  c1 = c1.replace(/import\('@nestjs\/core'\)\.Reflector/g, 'Reflector');
  fs.writeFileSync(f1, c1);
}

// 2. conversations.service.spec.ts
let f2 = 'src/modules/conversations/conversations.service.spec.ts';
let c2 = fs.readFileSync(f2, 'utf8');
if (c2.includes("import('./audio-transcription.service.js').AudioTranscriptionService")) {
  c2 = "import { AudioTranscriptionService } from './audio-transcription.service.js';\n" + c2;
  c2 = c2.replace(/import\('\.\/audio-transcription\.service\.js'\)\.AudioTranscriptionService/g, 'AudioTranscriptionService');
  fs.writeFileSync(f2, c2);
}

// 3. zenior-webhook.service.spec.ts
let f3 = 'src/modules/zenior/zenior-webhook.service.spec.ts';
let c3 = fs.readFileSync(f3, 'utf8');
if (c3.includes("import('../conversations/audio-transcription.service.js').AudioTranscriptionService")) {
  c3 = "import { AudioTranscriptionService } from '../conversations/audio-transcription.service.js';\n" + c3;
  c3 = c3.replace(/import\('\.\.\/conversations\/audio-transcription\.service\.js'\)\.AudioTranscriptionService/g, 'AudioTranscriptionService');
  fs.writeFileSync(f3, c3);
}

console.log('Fixed dynamic imports');
