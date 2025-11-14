import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { LeadStageFilter } from '../enums/ipk-leadd.enum';
import { OccupationInput } from './create-lead.input';

@InputType()
export class UpdateLeadDetailsInput {
  @Field(() => ID)
  leadId!: string;

  // Basic identity
  @Field({ nullable: true }) firstName?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field({ nullable: true }) name?: string;

  // Contact
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) location?: string;

  // Demographics
  @Field({ nullable: true }) gender?: string;
  @Field({ nullable: true }) age?: number;

  // Work/occupation: use occupations[] only
  @Field(() => [OccupationInput], { nullable: true }) occupations?: OccupationInput[];

  // Product interest
  @Field({ nullable: true }) product?: string;
  @Field({ nullable: true }) investmentRange?: string;
  @Field({ nullable: true }) sipAmount?: number;

  // Referral
  @Field({ nullable: true }) referralCode?: string;
  @Field({ nullable: true }) referralName?: string;

  // Profile
  @Field({ nullable: true }) bioText?: string;
  @Field({ nullable: true }) remark?: string;

  // Optional: next action date when editing
  @Field(() => GraphQLISODateTime, { nullable: true }) approachAt?: Date | null;

  // Optional RM intent/priority filter
  @Field(() => LeadStageFilter, { nullable: true }) stageFilter?: LeadStageFilter;
}
