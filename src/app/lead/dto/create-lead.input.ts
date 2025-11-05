import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { LeadStageFilter } from '../enums/ipk-leadd.enum';

@InputType()
export class CreateIpkLeaddInput {
  @Field({ nullable: true }) firstName?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field({ nullable: true }) name?: string;
  @Field({ nullable: true }) email?: string;

  @Field() phone!: string;
  @Field() leadSource!: string;

  @Field({ nullable: true }) referralCode?: string;
  @Field({ nullable: true }) referralName?: string;
  @Field({ nullable: true }) gender?: string;
  @Field({ nullable: true }) age?: number;
  @Field({ nullable: true }) location?: string;

  // Removed single profession/companyName/designation; use occupations[]

  @Field({ nullable: true }) product?: string;
  @Field({ nullable: true }) investmentRange?: string;
  @Field({ nullable: true }) sipAmount?: number;
  @Field({ nullable: true }) clientTypes?: string;
  @Field({ nullable: true }) remark?: string;
  @Field({ nullable: true }) bioText?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  approachAt?: Date | null;

  @Field(() => [ClientQaInput], { nullable: true })
  clientQa?: ClientQaInput[];

  // New: occupations array
  @Field(() => [OccupationInput], { nullable: true })
  occupations?: OccupationInput[];

  // Optional RM intent/priority filter
  @Field(() => LeadStageFilter, { nullable: true })
  stageFilter?: LeadStageFilter;
}

@InputType()
export class ClientQaInput {
  @Field() question!: string;
  @Field() answer!: string;
}

@InputType()
export class OccupationInput {
  @Field(() => String)
  profession!: string; // Prefer ProfessionEnum on client; string here for compatibility

  @Field({ nullable: true })
  companyName?: string;

  @Field({ nullable: true })
  designation?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  startedAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  endedAt?: Date;
}
@InputType()
export class BulkLeadRowInput extends CreateIpkLeaddInput {}
