// src/app/lead/dto/change-stage.input.ts
import { Field, ID, InputType } from '@nestjs/graphql';
import { ClientStage, InteractionChannel, LeadStageFilter } from '../enums/ipk-leadd.enum';

@InputType()
export class ChangeStageInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => ClientStage)
  stage!: ClientStage;

  // Optional RM-assigned intent/priority filter for this stage change
  @Field(() => LeadStageFilter, { nullable: true })
  stageFilter?: LeadStageFilter | null;

  @Field(() => Boolean, { nullable: true })
  productExplained?: boolean;

  @Field(() => InteractionChannel, { nullable: true })
  channel?: InteractionChannel;

  // UI “Next follow-up date” → stored in lead.approachAt
  @Field(() => Date, { nullable: true })
  nextFollowUpAt?: Date;

  // Optional free text note to attach to the event
  @Field(() => String, { nullable: true })
  note?: string;
}
