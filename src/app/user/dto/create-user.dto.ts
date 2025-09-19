import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Status, UserRoles } from '../enums/user.enums';
import { Gender } from '../../enums/common.enum';
import { $Enums } from '@prisma/client';

@InputType()
export class CreateUserInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field(() => UserRoles)
  @IsEnum(UserRoles)
  role!: $Enums.UserRoles;

  @Field(() => Gender, { nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: $Enums.Gender;

  @Field(() => String, { nullable: true })
  @IsOptional()
  phone?: string;

  @Field(() => Status, { defaultValue: Status.ACTIVE })
  @IsEnum(Status)
  status!: $Enums.Status;

  // You usually don't expose this on create; keeping archived false in service.
  @Field({ defaultValue: false })
  @IsOptional()
  archived?: boolean;
}
