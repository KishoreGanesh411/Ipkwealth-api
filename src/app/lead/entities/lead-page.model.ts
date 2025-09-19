// src/app/lead/entities/lead-page.model.ts
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IpkLeaddEntity } from './ipk-leadd.model';

@ObjectType()
export class LeadPage {
  @Field(() => [IpkLeaddEntity])
  items!: IpkLeaddEntity[];

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  total!: number;
}
