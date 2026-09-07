import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto.js';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
