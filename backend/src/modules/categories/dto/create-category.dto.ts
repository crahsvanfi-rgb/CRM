import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
