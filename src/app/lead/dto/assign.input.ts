import { Field, ID, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { AssignMode } from '../enums/ipk-leadd.enum';

@InputType()
export class AssignLeadInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => AssignMode)
  @IsEnum(AssignMode)
  mode!: AssignMode;

  // required when mode === MANUAL
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  rmId?: string;
}

@InputType()
export class AssignLeadsBulkInput {
  @Field(() => [ID])
  @IsArray()
  @ArrayNotEmpty()
  leadIds!: string[];

  @Field(() => AssignMode)
  @IsEnum(AssignMode)
  mode!: AssignMode;

  // required when mode === MANUAL
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  rmId?: string;
}
