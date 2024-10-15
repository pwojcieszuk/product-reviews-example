import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Smartphone X' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'A high-end smartphone with advanced features' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 799.99 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}
