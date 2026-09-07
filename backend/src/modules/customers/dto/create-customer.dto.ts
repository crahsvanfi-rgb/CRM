import { IsString, IsOptional, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export enum CustomerType {
  MAYORISTA = 'MAYORISTA',
  MINORISTA = 'MINORISTA',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  VIP = 'VIP',
  NUEVO = 'NUEVO',
  RECURRENTE = 'RECURRENTE',
  INACTIVO = 'INACTIVO',
}

export enum CustomerStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export class CreateCustomerDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio' })
  nombreComercial: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  razonSocial?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  nitCi?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  personaContacto?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  telefono?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsEmail({}, { message: 'El formato de email no es válido' })
  @IsOptional()
  email?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  direccion?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  ciudad?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  @IsOptional()
  departamento?: string;

  @IsEnum(CustomerType)
  @IsOptional()
  tipoCliente?: CustomerType;

  @IsEnum(CustomerStatus)
  @IsOptional()
  estado?: CustomerStatus;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  vendedorId?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  leadId?: string;
}
