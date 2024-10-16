import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { IsNotEmpty, IsString, IsNumber, Max, Min } from 'class-validator';
import { Product } from 'src/product/entities/product.entity';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity()
export class Review extends BaseEntity {
  @Column()
  @IsNotEmpty()
  @IsString()
  firstname: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  surname: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  reviewText: string;

  @Column()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ManyToOne(() => Product, (product) => product.reviews, {
    onDelete: 'CASCADE',
  })
  product: Product;
}
