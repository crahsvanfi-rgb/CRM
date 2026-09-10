import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendZernioMessageDto {
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @IsString()
  telefono: string;

  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @IsString()
  mensaje: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  zernioConversationId?: string;

  @IsOptional()
  @IsString()
  zernioAccountId?: string;
}
