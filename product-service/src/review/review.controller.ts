import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Review } from './entities/review.entity';

@ApiTags('Reviews')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: 201,
    description: 'Review successfully created',
    type: Review,
  })
  @ApiResponse({ status: 404, description: 'Product with id 1 not found' })
  create(@Body() createReviewDto: CreateReviewDto): Promise<Review> {
    return this.reviewService.create(createReviewDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update review by ID' })
  @ApiResponse({
    status: 200,
    description: 'Review successfully updated',
    type: Review,
  })
  @ApiResponse({ status: 404, description: 'Review with id 1 not found' })
  update(
    @Param('id') id: number,
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    return this.reviewService.update(id, updateReviewDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete review by ID' })
  @ApiResponse({ status: 200, description: 'Review successfully deleted' })
  remove(@Param('id') id: number): Promise<void> {
    return this.reviewService.remove(id);
  }
}
