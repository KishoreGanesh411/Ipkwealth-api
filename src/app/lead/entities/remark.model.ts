import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RemarkEntry {
  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  author?: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

