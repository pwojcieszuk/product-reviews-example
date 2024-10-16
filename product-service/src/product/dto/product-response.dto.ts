import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class ProductResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Smartphone X' })
  name: string;

  @ApiProperty({ example: 'A high-end smartphone with advanced features' })
  description: string;

  @ApiProperty({ example: 799.99 })
  price: number;

  @ApiProperty({ example: 4.5 })
  @IsOptional()
  averageRating?: number;
}
