import { Field, ID, InputType } from '@nestjs/graphql';
import { ApplicationStatusEnum, KycStatusEnum } from '../enums/application.enum';

@InputType()
export class CreateAccountApplicationInput {
  @Field(() => ID)
  leadId!: string;

  // Optional sensitive fields (encrypted in service)
  @Field(() => String, { nullable: true })
  pan?: string;

  @Field(() => String, { nullable: true })
  aadhaar?: string;

  // JSON-ish strings accepted; service can parse/validate
  @Field(() => String, { nullable: true })
  documentsJson?: string;

  @Field(() => String, { nullable: true })
  riskProfile?: string;

  @Field(() => String, { nullable: true })
  investmentPreferencesJson?: string;

  @Field(() => String, { nullable: true })
  consentAuditJson?: string;
}

@InputType()
export class UpdateApplicationStatusInput {
  @Field(() => ID)
  applicationId!: string;

  @Field(() => ApplicationStatusEnum)
  status!: ApplicationStatusEnum;

  @Field(() => String, { nullable: true })
  remark?: string;
}

@InputType()
export class UpdateKycStatusInput {
  @Field(() => ID)
  applicationId!: string;

  @Field(() => KycStatusEnum)
  kyc!: KycStatusEnum;

  @Field(() => String, { nullable: true })
  remark?: string;
}
