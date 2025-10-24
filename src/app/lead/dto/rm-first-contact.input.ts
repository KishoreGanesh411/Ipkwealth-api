// src/app/lead/dto/rm-first-contact.input.ts
import { Field, ID, InputType } from '@nestjs/graphql';
import { InteractionChannel } from '../enums/ipk-leadd.enum';

@InputType()
export class RmFirstContactInput {
  @Field(() => ID) leadId!: string;

  // Was product explained on this first talk?
  @Field() productExplained!: boolean;

  // Which source/channel did this happen on?
  @Field(() => InteractionChannel) channel!: InteractionChannel;

  // If not explained, capture the reason (plain text).
  @Field({ nullable: true }) notExplainedReason?: string;

  // Optional note to show in timeline
  @Field({ nullable: true }) note?: string;

  // Next follow-up date/time
  @Field({ nullable: true }) nextFollowUpAt?: Date;
}
