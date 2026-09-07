import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class ReleaseStockDto {
  @IsString()
  @IsNotEmpty()
  documentoRef: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  cantidad: number;
}
