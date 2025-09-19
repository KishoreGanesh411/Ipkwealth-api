import {
  ObjectType,
  Field,
  ID,
  Int,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import { LeadStatus } from '../enums/ipk-leadd.enum';

@ObjectType()
export class IpkLeaddEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  firstName?: string | null;

  @Field(() => String, { nullable: true })
  lastName?: string | null;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field(() => String)
  phone!: string;

  @Field(() => String, { nullable: true })
  leadCode?: string | null;

  @Field(() => String, { nullable: true })
  gender?: string | null;

  @Field(() => Int, { nullable: true })
  age?: number | null;

  @Field(() => String, { nullable: true })
  location?: string | null;

  @Field(() => String, { nullable: true })
  referralCode?: string | null;

  @Field(() => String)
  leadSource!: string;

  @Field(() => String, { nullable: true })
  profession?: string | null;

  @Field(() => String, { nullable: true })
  companyName?: string | null;

  @Field(() => String, { nullable: true })
  designation?: string | null;

  @Field(() => String, { nullable: true })
  product?: string | null;

  @Field(() => String, { nullable: true })
  investmentRange?: string | null;

  @Field(() => Int, { nullable: true })
  sipAmount?: number | null;

  @Field(() => String, { nullable: true })
  clientTypes?: string | null;

  @Field(() => String, { nullable: true })
  phoneNormalized?: string | null;

  @Field(() => Int, { nullable: true })
  reenterCount?: number | null;

  @Field(() => String, { nullable: true })
  remark?: string | null;

  @Field(() => ID, { nullable: true })
  assignedRmId?: string | null;

  @Field(() => String, { nullable: true })
  assignedRM?: string | null;

  @Field(() => LeadStatus)
  status!: LeadStatus;

  @Field(() => GraphQLISODateTime)
  approachAt?: Date | null;

  @Field(() => [String], { nullable: true })
  clientQa?: string[] | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  @Field(() => Boolean)
  archived!: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  firstSeenAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastSeenAt?: Date | null;
}
