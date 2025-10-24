import { Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql';
import { ApplicationStatusEnum, KycStatusEnum } from '../enums/application.enum';

@ObjectType()
export class AccountApplicationEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  leadId!: string;

  @Field(() => ApplicationStatusEnum)
  applicationStatus!: ApplicationStatusEnum;

  @Field(() => KycStatusEnum)
  kycStatus!: KycStatusEnum;

  // Do not expose sensitive values directly
  @Field(() => String, { nullable: true })
  riskProfile?: string | null;

  @Field(() => String, { nullable: true })
  documents?: string | null; // store summary string or reference ID

  @Field(() => GraphQLISODateTime, { nullable: true })
  submittedAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  reviewedAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  approvedAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  declinedAt?: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
