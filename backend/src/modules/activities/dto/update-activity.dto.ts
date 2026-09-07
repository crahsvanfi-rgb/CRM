import { PartialType } from '@nestjs/mapped-types';
import { CreateActivityDto } from './create-activity.dto.js';
import { IsEnum, IsOptional } from 'class-validator';
import { ActivityStatus } from '@prisma/client';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @IsEnum(ActivityStatus)
  @IsOptional()
  estado?: ActivityStatus;
}
