import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadTouchpointDto } from './create-touchpoint.dto.js';

export class UpdateLeadTouchpointDto extends PartialType(CreateLeadTouchpointDto) {}
