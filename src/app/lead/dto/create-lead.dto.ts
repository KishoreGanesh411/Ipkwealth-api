import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
 IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ClientQaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  question!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  answer!: string;
}

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  leadSource!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  referralCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  profession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  product?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  investmentRange?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sipAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  clientTypes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  bioText?: string;

  @IsOptional()
  @IsDateString()
  approachAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientQaDto)
  clientQa?: ClientQaDto[];
}
