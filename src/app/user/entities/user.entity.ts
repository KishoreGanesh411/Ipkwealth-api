import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';
import { IpkLeaddEntity } from '../../lead/entities/ipk-leadd.model';

@ObjectType()
export class UserEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  firebaseUid!: string;

  @Field(() => String, { nullable: true })
  gender?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => Boolean, { nullable: true })
  archived?: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastAssignedAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  createdAt?: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  updatedAt?: Date | null;

  @Field(() => [IpkLeaddEntity], { nullable: 'itemsAndList' })
  assignedLeads?: IpkLeaddEntity[];
}
