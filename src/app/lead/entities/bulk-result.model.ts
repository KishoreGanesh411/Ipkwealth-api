// src/app/lead/entities/bulk-result.model.ts
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class BulkImportResult {
  @Field(() => Int) created!: number;
  @Field(() => Int) merged!: number;
  @Field(() => Int) failed!: number;
  @Field(() => [String]) errors!: string[];
}
