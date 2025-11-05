import { InputType, Field, ID } from '@nestjs/graphql';
import { InteractionChannel } from '../enums/ipk-leadd.enum';

@InputType()
export class RmFirstContactInput {
  @Field(() => ID)
  leadId: string;

  @Field()
  productExplained: boolean;

  @Field(() => InteractionChannel)
  channel: InteractionChannel;

  @Field({ nullable: true })
  notExplainedReason?: string;

  @Field({ nullable: true })
  note?: string;

  @Field({ nullable: true })
  nextFollowUpAt?: Date;
}
