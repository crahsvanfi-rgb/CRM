import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Nombre de la plantilla', example: 'Bienvenida Promocional' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ description: 'Categoría de la plantilla', example: 'MARKETING' })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiProperty({ description: 'Cuerpo del mensaje con variables como {{nombre}}', example: 'Hola {{nombre}}, te tenemos una oferta...' })
  @IsString()
  @IsNotEmpty()
  cuerpo: string;

  @ApiPropertyOptional({ description: 'Estado activo de la plantilla', default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Categoría de la plantilla' })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({ description: 'Cuerpo del mensaje' })
  @IsString()
  @IsOptional()
  cuerpo?: string;

  @ApiPropertyOptional({ description: 'Estado activo de la plantilla' })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
