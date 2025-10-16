import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserInput } from './create-user.dto';
import { Status, UserRoles } from '../enums/user.enums';
import { Gender } from 'src/app/enums/common.enum';

@InputType()
export class UpdateUserDto extends PartialType(CreateUserInput) {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => UserRoles, { nullable: true })
  @IsOptional()
  @IsEnum(UserRoles)
  role?: UserRoles;

  // Toggle helper (service maps this to Status)
  @Field({ nullable: true })
  @IsOptional()
  active?: boolean;

  @Field(() => Gender, { nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @Field(() => String, { nullable: true })
  @IsOptional()
  phone?: string;

  @Field(() => Status, { nullable: true })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @Field({ nullable: true })
  @IsOptional()
  archived?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  firebaseUid?: string;

  // Optional password change handled via Firebase + DB hash update
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
