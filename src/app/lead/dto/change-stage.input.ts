// src/app/lead/dto/change-stage.input.ts
import { Field, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { ClientStage, InteractionChannel } from '../enums/ipk-leadd.enum';

registerEnumType(InteractionChannel, { name: 'InteractionChannel' });

@InputType()
export class ChangeStageInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => ClientStage)
  stage!: ClientStage;

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
