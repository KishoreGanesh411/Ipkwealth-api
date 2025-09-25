import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Gender } from '../../enums/common.enum';
import { Status, UserRoles } from '../enums/user.enums';

@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @IsString()
  @MinLength(8)
  // @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
  password!: string;

  @Field(() => UserRoles)
  @IsEnum(UserRoles)
  role!: UserRoles;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => Gender, { nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @Field(() => Status, { defaultValue: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @Field(() => Boolean, { defaultValue: false })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
