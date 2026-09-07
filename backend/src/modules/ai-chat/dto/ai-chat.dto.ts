import { IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  titulo?: string;
}

export class SendMessageDto {
  @IsString()
  contenido: string;
}

export class UpdateConversationDto {
  @IsString()
  titulo: string;
}
