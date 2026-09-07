import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { LeadTouchpointCanal, LeadStage } from '@prisma/client';

export class CreateLeadTouchpointDto {
  @IsEnum(LeadTouchpointCanal)
  canal: LeadTouchpointCanal;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @IsString()
  @IsOptional()
  participanteInterno?: string;

  @IsString()
  @IsOptional()
  participanteExterno?: string;

  @IsString()
  resumen: string;

  @IsString()
  @IsOptional()
  objeciones?: string;

  @IsString()
  @IsOptional()
  puntosInteres?: string;

  @IsString()
  @IsOptional()
  preferenciasContacto?: string;

  @IsOptional()
  materialEnviado?: any;

  @IsBoolean()
  @IsOptional()
  materialAbierto?: boolean;

  @IsString()
  @IsOptional()
  respuestaMaterial?: string;

  @IsEnum(LeadStage)
  @IsOptional()
  etapa?: LeadStage;

  @IsString()
  @IsOptional()
  compromisosPendientes?: string;

  @IsDateString()
  @IsOptional()
  fechaRecontacto?: string;
}
