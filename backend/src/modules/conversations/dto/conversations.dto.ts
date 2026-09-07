import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConversationStatus, MessageContentType } from '@prisma/client';

export class UpdateConversationStatusDto {
  @IsEnum(ConversationStatus)
  estado: ConversationStatus;
}

export class TransferToHumanDto {
  @IsUUID()
  asesorId: string;
}

export class SendMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;
  
  @IsEnum(MessageContentType)
  @IsOptional()
  messageType?: MessageContentType;
}
