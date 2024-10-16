import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int') // Rating value for the review
  rating: number;

  @Column() // Foreign key reference to Product
  productId: number;
}
