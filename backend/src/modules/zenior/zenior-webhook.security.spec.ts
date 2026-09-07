import { Test, TestingModule } from '@nestjs/testing';
import { ZeniorWebhookController } from './zenior-webhook.controller.js';
import { ZeniorWebhookService } from './zenior-webhook.service.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ZeniorWebhookController (Security)', () => {
  let controller: ZeniorWebhookController;
  let service: any;

  beforeEach(async () => {
    service = {
      verifyWebhookToken: vi.fn(),
      processIncomingEvent: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZeniorWebhookController],
      providers: [
        { provide: ZeniorWebhookService, useValue: service },
      ],
    }).compile();

    controller = module.get<ZeniorWebhookController>(ZeniorWebhookController);
  });

  describe('Webhook Validation', () => {
    it('should reject POST if tenant_id is missing', async () => {
      const res: any = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      };
      
      await controller.receiveMessage({} as any, res, '', '', '', '');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Missing tenant_id');
    });

    it('should reject POST with 401 if verify_token is invalid', async () => {
      const res: any = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      };
      
      service.verifyWebhookToken.mockResolvedValue(false);
      
      await controller.receiveMessage({} as any, res, 'tenant1', 'bad_token', '', '');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith('Unauthorized');
    });

    it('should accept POST and return EVENT_RECEIVED if token is valid', async () => {
      const res: any = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      };
      
      service.verifyWebhookToken.mockResolvedValue(true);
      
      await controller.receiveMessage({} as any, res, 'tenant1', 'good_token', '', '');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED');
      expect(service.processIncomingEvent).toHaveBeenCalled();
    });
  });
});
