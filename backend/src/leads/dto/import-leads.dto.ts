import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const IMPORT_LIMIT = 1000;

export type DuplicateMode = 'skip' | 'update' | 'duplicate';

export class ImportLeadRowDto {
  @IsString()
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  phoneType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagramUsername?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string;

  @IsOptional()
  @IsUUID('4')
  listId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mapsUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  googlePlaceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  googleRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  googleReviewCount?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isNetwork?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  adStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  cadenceStep?: number;

  @IsOptional()
  @IsDateString()
  followUpAt?: string;

  @IsUUID('4')
  stageId: string;
}

export class ImportLeadsDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsUUID('4')
  listId?: string;

  @IsOptional()
  @IsIn(['skip', 'update', 'duplicate'])
  duplicateMode: DuplicateMode = 'skip';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(IMPORT_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => ImportLeadRowDto)
  leads: ImportLeadRowDto[];
}
