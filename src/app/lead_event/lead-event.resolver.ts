import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { UserEntity } from '../user/entities/user.entity';
import { LogLeadCallInput } from './dto/lead-event.input';
import { LeadEventEntity } from './entities/lead-event.model';
import { LeadEventService } from './lead-event.service';

@Resolver(() => LeadEventEntity)
export class LeadEventResolver {
  constructor(private readonly leadEventService: LeadEventService) {}

  @UseGuards(GqlAuthGuard)
  @Mutation(() => LeadEventEntity)
  logLeadCall(@CurrentUser() user: UserEntity, @Args('input') input: LogLeadCallInput) {
    return this.leadEventService.logCall(user.id, input);
  }
}
