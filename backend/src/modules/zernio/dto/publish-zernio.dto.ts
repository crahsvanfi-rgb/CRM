import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class PublishZernioDto {
  @IsNotEmpty({ message: 'Debe especificar al menos una plataforma' })
  @IsArray()
  @IsString({ each: true })
  plataformas: string[];

  @IsNotEmpty({ message: 'El texto de la publicación es obligatorio' })
  @IsString()
  texto: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
