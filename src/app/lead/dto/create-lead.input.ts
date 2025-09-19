import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class CreateIpkLeaddInput {
  @Field({ nullable: true }) firstName?: string;
  @Field({ nullable: true }) lastName?: string;
  @Field({ nullable: true }) name?: string;
  @Field({ nullable: true }) email?: string;

  @Field() phone!: string;
  @Field() leadSource!: string;

  @Field({ nullable: true }) referralCode?: string;
  @Field({ nullable: true }) gender?: string;
  @Field({ nullable: true }) age?: number;
  @Field({ nullable: true }) location?: string;

  @Field({ nullable: true }) profession?: string;
  @Field({ nullable: true }) companyName?: string;
  @Field({ nullable: true }) designation?: string;

  @Field({ nullable: true }) product?: string;
  @Field({ nullable: true }) investmentRange?: string;
  @Field({ nullable: true }) sipAmount?: number;
  @Field({ nullable: true }) clientTypes?: string;
  @Field({ nullable: true }) remark?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  approachAt?: Date | null;

  @Field(() => GraphQLJSON, { nullable: true })
  clientQa?: any | null;
}

@InputType()
export class BulkLeadRowInput extends CreateIpkLeaddInput { }
