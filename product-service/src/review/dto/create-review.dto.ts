import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstname: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  surname: string;

  @ApiProperty({
    example: 'Great product! I loved the design and performance.',
  })
  @IsNotEmpty()
  @IsString()
  reviewText: string;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  productId: number;
}
