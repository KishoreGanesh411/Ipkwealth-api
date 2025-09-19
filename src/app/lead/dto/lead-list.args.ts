// src/app/lead/dto/lead-list.args.ts
import { Field, InputType, Int } from '@nestjs/graphql';
import { LeadStatus } from '../enums/ipk-leadd.enum';

@InputType()
export class LeadListArgs {
  @Field(() => Boolean, { nullable: true })
  archived?: boolean;

  @Field(() => LeadStatus, { nullable: true })
  status?: LeadStatus;

  @Field({ nullable: true })
  search?: string;

  /** page starts at 1 */
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  pageSize?: number;
}
