import { IsString, IsNotEmpty, IsEnum, IsNumber, IsPositive, IsOptional, IsUUID } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @IsEnum(MovementType)
  @IsNotEmpty()
  tipo: MovementType;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  cantidad: number;

  @IsString()
  @IsOptional()
  motivo?: string;

  @IsString()
  @IsOptional()
  documentoRef?: string;
}
