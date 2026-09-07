import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpsertCampaignConfigDto {
  @IsBoolean()
  @IsOptional()
  campanasActivas?: boolean;

  @IsBoolean()
  @IsOptional()
  zeniorConfigurado?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  limiteMensajesPorDia?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  limiteMensajesPorHora?: number;

  @IsOptional()
  costoPorMensajeWhatsapp?: number;

  @IsOptional()
  costoPorMensajeSms?: number;

  @IsInt()
  @Min(100)
  @IsOptional()
  intervaloEntreEnviosMs?: number;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'horarioPermitidoInicio debe tener formato HH:mm (ej: 08:30)',
  })
  horarioPermitidoInicio?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'horarioPermitidoFin debe tener formato HH:mm (ej: 20:00)',
  })
  horarioPermitidoFin?: string;

  @IsString()
  @IsOptional()
  firma?: string;

  @IsString()
  @IsOptional()
  mensajePredeterminado?: string;

  @IsBoolean()
  @IsOptional()
  aprobacionObligatoria?: boolean;

  @IsBoolean()
  @IsOptional()
  permiteAutomatizaciones?: boolean;

  @IsBoolean()
  @IsOptional()
  iaHabilitada?: boolean;

  @IsString()
  @IsOptional()
  estado?: string;
}
