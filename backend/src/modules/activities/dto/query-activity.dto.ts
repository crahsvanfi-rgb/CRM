import { IsOptional, IsString, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ActivityType, ActivityStatus } from '@prisma/client';

export class QueryActivityDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  tipo?: ActivityType;

  @IsOptional()
  @IsEnum(ActivityStatus)
  estado?: ActivityStatus;

  @IsOptional()
  @IsUUID()
  responsableId?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}
