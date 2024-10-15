import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Review } from 'src/review/entities/review.entity';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity()
export class Product extends BaseEntity {
  @Column()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];
}
