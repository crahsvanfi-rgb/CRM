import { PrismaService } from '../../prisma/prisma.service.js';
import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotConfigController } from './chatbot-config.controller.js';
import { ChatbotConfigService } from './chatbot-config.service.js';

describe('ChatbotConfigController', () => {
  let controller: ChatbotConfigController;
  let service: ChatbotConfigService;

  const mockService = {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    testChatbot: vi.fn(),
    activate: vi.fn(),
    reset: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotConfigController],
      providers: [
        { provide: PrismaService, useValue: { getTenantClient: vi.fn() } },
        { provide: Reflector, useValue: { get: vi.fn(), getAllAndOverride: vi.fn() } },
        { provide: ChatbotConfigService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ChatbotConfigController>(ChatbotConfigController);
    service = module.get<ChatbotConfigService>(ChatbotConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get config', async () => {
    mockService.getConfig.mockResolvedValue({ id: '1', nombre: 'Test Bot' });
    const result = await controller.getConfig('tenant-1');
    expect(result).toEqual({ id: '1', nombre: 'Test Bot' });
    expect(mockService.getConfig).toHaveBeenCalledWith('tenant-1');
  });

  it('should update config', async () => {
    const dto = { nombre: 'Nuevo Nombre' };
    mockService.updateConfig.mockResolvedValue({ id: '1', ...dto });
    const result = await controller.updateConfig('tenant-1', 'user-1', dto);
    expect(result.nombre).toBe('Nuevo Nombre');
  });

  it('should test chatbot', async () => {
    mockService.testChatbot.mockResolvedValue({ reply: 'Hola', tokens: 10 });
    const result = await controller.testChatbot('tenant-1', 'user-1', 'Hola bot');
    expect(result).toEqual({ reply: 'Hola', tokens: 10 });
  });

  it('should activate chatbot', async () => {
    mockService.activate.mockResolvedValue({ activo: true });
    const result = await controller.activate('tenant-1', 'user-1', true);
    expect(result).toEqual({ activo: true });
  });

  it('should reset config', async () => {
    mockService.reset.mockResolvedValue({ id: 'default' });
    const result = await controller.reset('tenant-1', 'user-1');
    expect(result).toEqual({ id: 'default' });
  });
});
