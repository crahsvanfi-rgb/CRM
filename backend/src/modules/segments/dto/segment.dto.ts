import { IsString, IsOptional, IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { SegmentType } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

export class CreateSegmentDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(SegmentType)
  tipoSegmento: SegmentType;

  @IsObject()
  condiciones: Record<string, any>;
}

export class UpdateSegmentDto extends PartialType(CreateSegmentDto) {}
