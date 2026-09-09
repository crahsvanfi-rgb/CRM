import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PermisosDto {
  @IsBoolean()
  @IsOptional()
  consultarProductos?: boolean;

  @IsBoolean()
  @IsOptional()
  consultarStock?: boolean;

  @IsBoolean()
  @IsOptional()
  consultarPrecios?: boolean;

  @IsBoolean()
  @IsOptional()
  consultarPedidos?: boolean;

  @IsBoolean()
  @IsOptional()
  capturarLeads?: boolean;

  @IsBoolean()
  @IsOptional()
  generarActividades?: boolean;
}

export class ChatbotConfigDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  promptSistema?: string;

  @IsString()
  @IsOptional()
  personalidad?: string;

  @IsString()
  @IsOptional()
  tono?: string;

  @IsString()
  @IsOptional()
  idioma?: string;

  @IsString()
  @IsOptional()
  mensajeInicial?: string;

  @IsObject()
  @IsOptional()
  horarioAtencion?: Record<string, [string, string]>;

  @IsString()
  @IsOptional()
  mensajeFueraHorario?: string;

  @IsString()
  @IsOptional()
  reglasComerciales?: string;

  @IsString()
  @IsOptional()
  informacionInstitucional?: string;

  @IsString()
  @IsOptional()
  instruccionesProhibidas?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  nivelCreatividad?: number;

  @IsString()
  @IsOptional()
  modeloOpenRouter?: string;

  @IsInt()
  @Min(100)
  @Max(8000)
  @IsOptional()
  maxTokens?: number;

  @IsObject()
  @ValidateNested()
  @Type(() => PermisosDto)
  @IsOptional()
  permisos?: PermisosDto;

  @IsBoolean()
  @IsOptional()
  transferirHumano?: boolean;

  @IsString()
  @IsOptional()
  estado?: string;
}