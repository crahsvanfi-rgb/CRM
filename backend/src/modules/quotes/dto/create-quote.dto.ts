import { IsString, IsNotEmpty, IsEnum, IsNumber, IsPositive, IsOptional, IsUUID, IsArray, ValidateNested, IsDateString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QuoteItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  cantidad?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precioUnitario?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento?: number;
}

export class CreateQuoteDto {
  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsUUID()
  vendedorId?: string;

  @IsOptional()
  @Transform(({ value }) => (!value || value === '' ? undefined : value))
  @IsDateString()
  fechaVencimiento?: string;

  @IsString()
  @IsOptional()
  moneda?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  impuestos?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  condiciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items?: QuoteItemDto[];
}
