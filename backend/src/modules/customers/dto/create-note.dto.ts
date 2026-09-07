import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCustomerNoteDto {
  @IsString()
  @IsNotEmpty()
  nota: string;
}
