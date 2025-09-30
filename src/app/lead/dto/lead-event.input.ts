import { Field, ID, InputType } from '@nestjs/graphql';

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
