import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, IsEmail, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum LeadStatus {
  NUEVO = 'NUEVO',
  CONTACTADO = 'CONTACTADO',
  INTERESADO = 'INTERESADO',
  COTIZACION = 'COTIZACION',
  NEGOCIACION = 'NEGOCIACION',
  GANADO = 'GANADO',
  PERDIDO = 'PERDIDO',
}

export enum LeadEtapaVenta {
  PROSPECTO_NUEVO = 'PROSPECTO_NUEVO',
  CONTACTO_REALIZADO = 'CONTACTO_REALIZADO',
  CLIENTE_CALIFICADO = 'CLIENTE_CALIFICADO',
  COTIZACION_ENVIADA = 'COTIZACION_ENVIADA',
  NEGOCIACION = 'NEGOCIACION',
  CIERRE_GANADO = 'CIERRE_GANADO',
  CIERRE_PERDIDO = 'CIERRE_PERDIDO',
}

export enum TipoCarga {
  MARITIMO = 'MARITIMO',
  AEREO = 'AEREO',
  TERRESTRE = 'TERRESTRE',
}

export class CreateLeadDto {
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  name?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  nombre?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  companyName?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  empresa?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  email?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  phone?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  telefono?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  ciudad?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  city?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  fuente?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  source?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  productoInteres?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsEnum(LeadStatus)
  @IsOptional()
  estado?: LeadStatus;

    @IsEnum(LeadEtapaVenta)
  @IsOptional()
  etapaVenta?: LeadEtapaVenta;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  montoEstimado?: number;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  paisOrigen?: string;

  @IsEnum(TipoCarga)
  @IsOptional()
  tipoCarga?: TipoCarga;
@Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  motivoPerdida?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsDateString()
  @IsOptional()
  proximoSeguimiento?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  vendedorId?: string;
}
