import { IsString, IsNotEmpty, IsInt, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { AIOperationType } from '@prisma/client';

export class CreateAiUsageDto {
  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @IsString()
  @IsNotEmpty()
  agente: string;

  @IsString()
  @IsNotEmpty()
  modelo: string;

  @IsEnum(AIOperationType)
  @IsNotEmpty()
  tipoOperacion: AIOperationType;

  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @IsInt()
  @IsOptional()
  promptTokens?: number;

  @IsInt()
  @IsOptional()
  completionTokens?: number;

  @IsInt()
  @IsOptional()
  totalTokens?: number;
}
