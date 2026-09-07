import { IsEnum, IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export enum ActivityType {
  LLAMADA = 'LLAMADA',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  REUNION = 'REUNION',
  TAREA = 'TAREA',
  OTRO = 'OTRO',
}

export class CreateCustomerActivityDto {
  @IsEnum(ActivityType)
  tipo: ActivityType;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsBoolean()
  @IsOptional()
  completada?: boolean;
}
