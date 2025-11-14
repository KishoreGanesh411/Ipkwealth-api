import { Field, ID, InputType, Int, registerEnumType } from '@nestjs/graphql';
import {
  DormantReason,
  InteractionChannel,
  InteractionOutcome,
} from '../../lead/enums/ipk-leadd.enum';

export enum CallDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

registerEnumType(CallDirection, {
  name: 'CallDirection',
});

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
export class LogLeadCallInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => String)
  phoneNumber!: string;

  @Field(() => CallDirection)
  direction!: CallDirection;

  @Field(() => Int)
  durationSec!: number;

  @Field(() => Date, { nullable: true })
  occurredAt?: Date;

  @Field(() => String, { nullable: true })
  text?: string;

  @Field(() => InteractionOutcome, { nullable: true })
  outcome?: InteractionOutcome;
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
