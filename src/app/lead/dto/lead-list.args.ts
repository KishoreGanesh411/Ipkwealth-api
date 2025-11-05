// src/app/lead/dto/lead-list.args.ts
import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { ClientStage, LeadStatus, LeadStageFilter } from '../enums/ipk-leadd.enum';

@InputType()
export class LeadListArgs {
  @Field(() => Boolean, { nullable: true })
  archived?: boolean;

  @Field(() => LeadStatus, { nullable: true })
  status?: LeadStatus;

  @Field({ nullable: true })
  search?: string;

  /** page starts at 1 */
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  pageSize?: number;

  @Field(() => Boolean, { nullable: true })
  dormantOnly?: boolean;

  @Field(() => Int, { nullable: true })
  dormantDays?: number | null;

  // ★ stage filters
  @Field(() => ClientStage, { nullable: true }) clientStage?: ClientStage;
  @Field(() => [ClientStage], { nullable: true }) stageIn?: ClientStage[];
  // Optional RM intent/priority filter
  @Field(() => LeadStageFilter, { nullable: true }) stageFilter?: LeadStageFilter;

  // ★ RM scope
  @Field(() => ID, { nullable: true }) assignedRmId?: string;

  // ★ helpers
  @Field(() => Boolean, { nullable: true }) followUpDueOnly?: boolean; // approachAt <= now
  @Field(() => Int, { nullable: true }) lastSeenBeforeDays?: number; // no contact since N days

  // existing dormant helpers

  // optional created range
  @Field({ nullable: true }) createdAfter?: Date;
  @Field({ nullable: true }) createdBefore?: Date;
}
