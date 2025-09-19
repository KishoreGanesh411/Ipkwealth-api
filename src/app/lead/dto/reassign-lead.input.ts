import { Field, ID, InputType } from '@nestjs/graphql';

/**
 * Input for reassigning a lead to a new RM.  Admins supply the lead ID and
 * the new RM user ID.
 */
@InputType()
export class ReassignLeadInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => ID)
  newRmId!: string;
}
