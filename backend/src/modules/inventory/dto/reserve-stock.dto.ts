import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsUUID } from 'class-validator';

export class ReserveStockDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  cantidad: number;

  @IsString()
  @IsNotEmpty()
  documentoRef: string;
}
