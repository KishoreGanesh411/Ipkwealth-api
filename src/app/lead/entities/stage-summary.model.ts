// src/app/lead/entities/stage-summary.model.ts
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClientStage } from '../enums/ipk-leadd.enum';

@ObjectType()
export class StageSummaryItem {
  @Field(() => ClientStage, { nullable: true }) stage!: ClientStage | null; // null = unset
  @Field(() => Int) count!: number;
}

@ObjectType()
export class StageSummary {
  @Field(() => [StageSummaryItem]) items!: StageSummaryItem[];
  @Field(() => Int) total!: number;
}
