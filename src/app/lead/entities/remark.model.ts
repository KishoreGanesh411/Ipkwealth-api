// src/app/lead/entities/remark.model.ts
import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RemarkModel {
  @Field(() => String)
  text!: string;

  @Field(() => String)
  at!: string;

  @Field(() => String, { nullable: true })
  by?: string | null;

  @Field(() => String, { nullable: true })
  byName?: string | null;
}

@ObjectType()
export class RemarkEntry {
  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  author?: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
