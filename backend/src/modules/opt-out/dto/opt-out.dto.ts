import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContactType } from '@prisma/client';

export class CreateOptOutDto {
  @IsString()
  @IsNotEmpty()
  contactoId: string;

  @IsEnum(ContactType)
  @IsNotEmpty()
  tipoContacto: ContactType;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  motivo?: string;
}
