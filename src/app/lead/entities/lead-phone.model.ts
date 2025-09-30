import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { PhoneLabel } from '../enums/ipk-leadd.enum';

@ObjectType()
export class LeadPhoneEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  leadId!: string;

  @Field(() => PhoneLabel)
  label!: PhoneLabel;

  @Field(() => String)
  number!: string;

  @Field(() => String)
  normalized!: string;

  @Field(() => Boolean)
  isPrimary!: boolean;

  @Field(() => Boolean)
  isWhatsapp!: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  verifiedAt?: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

