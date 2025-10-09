import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { Gender } from '../../enums/common.enum';
import { Status, UserRoles } from '../enums/user.enums';
import { IpkLeaddEntity } from '../../lead/entities/ipk-leadd.model';

@ObjectType()
export class UserEntity {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  email!: string;

  @Field(() => UserRoles)
  role!: UserRoles;

  @Field(() => String)
  firebaseUid!: string;

  @Field(() => Gender, { nullable: true })
  gender?: Gender | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => Status)
  status!: Status;

  @Field(() => Boolean)
  archived!: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastAssignedAt?: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  @Field(() => [IpkLeaddEntity], { nullable: 'itemsAndList' })
  assignedLeads?: IpkLeaddEntity[];
}

@ObjectType()
export class CreateUserPayload {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string | null;

  @Field(() => UserEntity, { nullable: true })
  user?: UserEntity | null;
}

@ObjectType()
export class InviteRmPayload {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string | null;

  @Field(() => UserEntity, { nullable: true })
  user?: UserEntity | null;

  // Return starter password to share out-of-band
  @Field(() => String, { nullable: true })
  starterPassword?: string | null;
}

@ObjectType()
export class SyncReport {
  @Field(() => Number)
  checked!: number;

  @Field(() => Number)
  linkedByEmail!: number;

  @Field(() => Number)
  createdInFirebase!: number;

  @Field(() => Number)
  updatedEmail!: number;

  @Field(() => Number)
  updatedDisplayName!: number;

  @Field(() => [String])
  missingFirebase!: string[];
}
