import fs from 'fs';

// 1. chatbot-config.controller.spec.ts
let f1 = 'src/modules/chatbot-config/chatbot-config.controller.spec.ts';
let c1 = fs.readFileSync(f1, 'utf8');
if (!c1.includes('Reflector')) {
  c1 = c1.replace(/providers: \[/, "providers: [\n        { provide: import('@nestjs/core').Reflector, useValue: { get: vi.fn(), getAllAndOverride: vi.fn() } },");
  fs.writeFileSync(f1, c1);
}

// 2. conversations.service.spec.ts
let f2 = 'src/modules/conversations/conversations.service.spec.ts';
let c2 = fs.readFileSync(f2, 'utf8');
if (!c2.includes('AudioTranscriptionService')) {
  c2 = c2.replace(/providers: \[/, "providers: [\n        { provide: import('./audio-transcription.service.js').AudioTranscriptionService, useValue: {} },");
  fs.writeFileSync(f2, c2);
}

// 3. zenior-webhook.service.spec.ts
let f3 = 'src/modules/zenior/zenior-webhook.service.spec.ts';
let c3 = fs.readFileSync(f3, 'utf8');
if (!c3.includes('AudioTranscriptionService')) {
  c3 = c3.replace(/providers: \[/, "providers: [\n        { provide: import('../conversations/audio-transcription.service.js').AudioTranscriptionService, useValue: {} },");
  fs.writeFileSync(f3, c3);
}

console.log('Fixed providers');
