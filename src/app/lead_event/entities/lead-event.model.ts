import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { LeadEventType } from '../../lead/enums/ipk-leadd.enum';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class LeadEventEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  leadId!: string;

  @Field(() => ID, { nullable: true })
  authorId?: string | null;

  @Field(() => LeadEventType)
  type!: LeadEventType;

  @Field(() => GraphQLISODateTime)
  occurredAt!: Date;

  @Field(() => String, { nullable: true })
  text?: string | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  prev?: unknown;

  @Field(() => GraphQLJSON, { nullable: true })
  next?: unknown;

  @Field(() => GraphQLJSON, { nullable: true })
  meta?: unknown;
}
