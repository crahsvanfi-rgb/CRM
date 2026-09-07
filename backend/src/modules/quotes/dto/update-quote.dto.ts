import { IsString, IsEnum, IsNumber, IsPositive, IsOptional, IsUUID, IsArray, ValidateNested, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QuoteItemDto } from './create-quote.dto.js';

export class UpdateQuoteDto {
  @IsUUID()
  @IsOptional()
  clienteId?: string;

  @IsUUID()
  @IsOptional()
  vendedorId?: string;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsString()
  @IsOptional()
  moneda?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  condiciones?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items?: QuoteItemDto[];
}
