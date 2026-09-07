import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  diasInactivo?: number;
}
