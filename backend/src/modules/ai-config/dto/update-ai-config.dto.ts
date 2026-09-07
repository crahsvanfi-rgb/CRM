import { IsBoolean, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAiConfigDto {
  @IsBoolean()
  @IsOptional()
  habilitada?: boolean;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  modelo?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  @Type(() => Number)
  temperatura?: number;

  @IsNumber()
  @Min(100)
  @Max(4000)
  @IsOptional()
  @Type(() => Number)
  maxTokens?: number;

  @IsString()
  @IsOptional()
  promptGeneral?: string;

  @IsString()
  @IsOptional()
  instruccionesInternas?: string;

  @IsString()
  @IsOptional()
  tono?: string;

  @IsString()
  @IsOptional()
  idioma?: string;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsOptional()
  id?: string;

  @IsOptional()
  tenantId?: string;
}

