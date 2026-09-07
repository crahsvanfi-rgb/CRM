import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ContactType, ConsentStatus } from '@prisma/client';

export class RegisterConsentDto {
  @IsString()
  @IsNotEmpty()
  contactoId: string;

  @IsEnum(ContactType)
  @IsNotEmpty()
  tipoContacto: ContactType;

  @IsEnum(ConsentStatus)
  @IsNotEmpty()
  estado: ConsentStatus;

  @IsString()
  @IsOptional()
  fuenteConsentimiento?: string;

  @IsString()
  @IsOptional()
  canal?: string;

  @IsString()
  @IsOptional()
  origen?: string;

  @IsString()
  @IsOptional()
  ipOrigen?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsUUID()
  @IsOptional()
  leadId?: string;
}
