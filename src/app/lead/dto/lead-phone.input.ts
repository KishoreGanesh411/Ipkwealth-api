import { Field, ID, InputType } from '@nestjs/graphql';
import { PhoneLabel } from '../enums/ipk-leadd.enum';

@InputType()
export class LeadPhoneInput {
  @Field(() => PhoneLabel, { defaultValue: PhoneLabel.MOBILE })
  label!: PhoneLabel;

  @Field(() => String)
  number!: string;

  @Field(() => Boolean, { defaultValue: false })
  isPrimary?: boolean;

  @Field(() => Boolean, { defaultValue: false })
  isWhatsapp?: boolean;
}

@InputType()
export class UpdateLeadRemarkInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => String)
  remark!: string;
}

@InputType()
export class UpdateLeadBioInput {
  @Field(() => ID)
  leadId!: string;

  @Field(() => String)
  bioText!: string;
}

