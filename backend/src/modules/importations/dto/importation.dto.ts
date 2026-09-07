import { IsString, IsOptional, IsDateString, IsUUID, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ImportationStatus } from '@prisma/client';

export class CreateImportationItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUnitario?: number;
}

export class CreateImportationDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsUUID()
  proveedorId?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsString()
  paisOrigen?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsDateString()
  fechaCompra?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsDateString()
  eta?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsString()
  medioTransporte?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsString()
  numeroContenedor?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsString()
  referencia?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImportationItemDto)
  items?: CreateImportationItemDto[];
}

export class UpdateImportationDto {
  @IsOptional()
  @IsString()
  paisOrigen?: string;

  @IsOptional()
  @IsDateString()
  fechaCompra?: string;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsDateString()
  eta?: string;
  
  @IsOptional()
  @IsDateString()
  fechaLlegadaReal?: string;

  @IsOptional()
  @IsString()
  medioTransporte?: string;

  @IsOptional()
  @IsString()
  numeroContenedor?: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImportationItemDto)
  items?: CreateImportationItemDto[];
}
