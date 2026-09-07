import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  contacto?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
