import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, IsArray, IsNotEmpty } from 'class-validator';
import { CampaignChannel, CampaignObjective, CampaignStatus } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(CampaignChannel)
  canal: CampaignChannel;

  @IsEnum(CampaignObjective)
  objetivo: CampaignObjective;

  @IsUUID()
  responsableId: string;

  @IsDateString()
  @IsOptional()
  fechaProgramada?: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class AddRecipientsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  clienteIds?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  leadIds?: string[];
}

export class AddSegmentRecipientsDto {
  @IsUUID()
  segmentId: string;
}

export class UpdateVelocityDto {
  @IsOptional()
  limiteMensajesPorHora?: number;

  @IsOptional()
  intervaloEntreEnviosMs?: number;

  @IsOptional()
  concurrencia?: number;

  @IsOptional()
  maxReintentos?: number;

  @IsOptional()
  pausada?: boolean;
}

export class AutoRecoverInactiveDto {
  @IsNotEmpty()
  diasInactivo: number;

  @IsOptional()
  priorizarConIA?: boolean;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEnum(CampaignChannel)
  @IsOptional()
  canal?: CampaignChannel;
}

export class AutoProductDto {
  @IsUUID()
  @IsNotEmpty()
  productoId: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEnum(CampaignChannel)
  @IsOptional()
  canal?: CampaignChannel;
}

export class AutoVendorDto {
  @IsUUID()
  @IsNotEmpty()
  vendedorId: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEnum(CampaignChannel)
  @IsOptional()
  canal?: CampaignChannel;
}

export class ProcessResponseDto {
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;
}

