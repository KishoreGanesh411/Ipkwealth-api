import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { CreateIpkLeaddInput } from './create-lead.input';

@InputType()
export class UpdateIpkLeaddInput extends PartialType(CreateIpkLeaddInput) {
  @Field(() => ID)
  id!: string;
}
