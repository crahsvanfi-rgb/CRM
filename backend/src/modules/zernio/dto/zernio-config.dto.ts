import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class ZernioConfigDto {
  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  habilitado?: boolean;

  @IsOptional()
  @IsString()
  phone_number_id?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsString()
  verify_token?: string;
}
