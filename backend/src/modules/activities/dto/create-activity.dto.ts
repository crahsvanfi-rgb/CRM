import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsUUID, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @IsEnum(ActivityType)
  @IsNotEmpty()
  tipo: ActivityType;

  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsDateString()
  fecha?: string;

  @IsString()
  @IsOptional()
  hora?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsUUID()
  leadId?: string;

  @IsBoolean()
  @IsOptional()
  notificar?: boolean;
}
