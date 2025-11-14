import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { LeadEventEntity } from '../../lead_event/entities/lead-event.model';
import { ClientStage, LeadStageFilter, LeadStatus } from '../enums/ipk-leadd.enum';
import { LeadPhoneEntity } from './lead-phone.model';
import { RemarkModel } from './remark.model';

@ObjectType()
export class ClientQaItem {
  @Field(() => String)
  question!: string;

  @Field(() => String)
  answer!: string;
}

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

  @Field(() => String, { nullable: true })
  referralName?: string | null;

  @Field(() => String)
  leadSource!: string;

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

  @Field(() => [LeadPhoneEntity], { nullable: 'itemsAndList' })
  phones?: LeadPhoneEntity[] | null;

  @Field(() => [RemarkModel], { nullable: true })
  remark?: RemarkModel[];

  @Field(() => GraphQLJSON, { nullable: true })
  history?: unknown;

  @Field(() => String, { nullable: true })
  bioText?: string | null;

  @Field(() => ID, { nullable: true })
  assignedRmId?: string | null;

  @Field(() => String, { nullable: true })
  assignedRM?: string | null;

  @Field(() => LeadStatus)
  status!: LeadStatus;

  @Field(() => ClientStage, { nullable: true })
  clientStage?: ClientStage | null;

  @Field(() => LeadStageFilter, { nullable: true })
  stageFilter?: LeadStageFilter | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  approachAt?: Date | null;

  @Field(() => [ClientQaItem], { nullable: 'itemsAndList' })
  clientQa?: ClientQaItem[] | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastContactedAt?: Date | null;

  @Field(() => Int, { nullable: true })
  contactAttempts?: number | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  nextActionDueAt?: Date | null;

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

  @Field(() => [LeadEventEntity], { nullable: 'itemsAndList' })
  events?: LeadEventEntity[] | null;

  @Field(() => [OccupationEntity], { nullable: 'itemsAndList' })
  occupations?: OccupationEntity[] | null;
}

@ObjectType()
export class OccupationEntity {
  @Field(() => String)
  profession!: string;

  @Field(() => String, { nullable: true })
  companyName?: string | null;

  @Field(() => String, { nullable: true })
  designation?: string | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  startedAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  endedAt?: Date | null;
}

@ObjectType()
export class AssignResult {
  @Field(() => IpkLeaddEntity) lead!: IpkLeaddEntity;
  @Field() message!: string;
}

@ObjectType()
export class AssignBulkItemResult {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean)
  ok!: boolean;

  @Field()
  message!: string;
}

@ObjectType()
export class AssignBulkResult {
  @Field(() => [AssignBulkItemResult])
  items!: AssignBulkItemResult[];

  @Field(() => Int)
  assigned!: number;

  @Field(() => Int)
  failed!: number;

  @Field(() => [String])
  errors!: string[];
}
