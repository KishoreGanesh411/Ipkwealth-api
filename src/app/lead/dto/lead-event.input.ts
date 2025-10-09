import { Field, ID, InputType } from '@nestjs/graphql';
import {
  DormantReason,
  InteractionChannel,
  InteractionOutcome,
} from '../enums/ipk-leadd.enum';

@InputType()
export class LeadNoteInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => String)
  text!: string;

  @Field(() => [String], { defaultValue: [] })
  tags?: string[];
}

@InputType()
export class LeadInteractionInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => String)
  text!: string;

  @Field(() => [String], { defaultValue: [] })
  tags?: string[];

  @Field(() => InteractionChannel, { nullable: true })
  channel?: InteractionChannel;

  @Field(() => InteractionOutcome, { nullable: true })
  outcome?: InteractionOutcome;

  @Field(() => Date, { nullable: true })
  nextFollowUpAt?: Date;

  @Field(() => DormantReason, { nullable: true })
  dormantReason?: DormantReason;
}

@InputType()
export class ClientQaItemInput {
  @Field(() => String)
  question!: string;

  @Field(() => String)
  answer!: string;
}

@InputType()
export class UpdateLeadClientQaInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => [ClientQaItemInput])
  items!: ClientQaItemInput[];
}
