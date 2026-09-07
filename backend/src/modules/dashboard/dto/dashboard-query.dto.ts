import { IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;
}
