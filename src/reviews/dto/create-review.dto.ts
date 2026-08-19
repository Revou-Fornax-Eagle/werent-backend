import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { FitFeedback } from '../../common/enums/fit-feedback.enum';

export class CreateReviewDto {
  @IsUUID('all', { message: 'productId must be a valid UUID' })
  productId!: string;

  @IsUUID('all', { message: 'userId must be a valid UUID' })
  userId!: string;

  @Type(() => Number)
  @IsInt({ message: 'rating must be an integer' })
  @Min(1, { message: 'rating must be at least 1' })
  @Max(5, { message: 'rating must be at most 5' })
  rating!: number;

  @IsString()
  @IsNotEmpty({ message: 'title must not be empty' })
  @Length(3, 100, { message: 'title must be between 3 and 100 characters' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'body must not be empty' })
  @Length(10, 2000, { message: 'body must be between 10 and 2000 characters' })
  body!: string;

  @IsOptional()
  @IsEnum(FitFeedback, { message: 'fitFeedback must be one of: RUNS_SMALL, TRUE_TO_SIZE, RUNS_LARGE' })
  fitFeedback?: FitFeedback;
}
