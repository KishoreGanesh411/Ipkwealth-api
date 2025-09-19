import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType()
class UpdateStatusDto {
  @Field()
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType()
class CreatedBy {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  name?: string;
}

@InputType()
class CreatedByDto {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String, { nullable: true })
  name?: string;
}

@InputType()
export class PaginationDto {
  @Field(() => String, { nullable: true })
  cursorId?: string;

  @Field(() => Number, { nullable: true })
  take?: number;

  @Field(() => Number, { nullable: true })
  skip?: number;
}

export { UpdateStatusDto, CreatedByDto, CreatedBy };
