import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FirebaseAuthGuard } from '../core/firebase/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { AccountApplicationEntity } from './entities/account-application.model';
import { AccountApplicationService } from './account-application.service';
import {
  CreateAccountApplicationInput,
  UpdateApplicationStatusInput,
  UpdateKycStatusInput,
} from './dto/account-application.input';

@Resolver(() => AccountApplicationEntity)
export class AccountApplicationResolver {
  constructor(private readonly service: AccountApplicationService) {}

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => AccountApplicationEntity)
  createAccountApplication(
    @Args('input') input: CreateAccountApplicationInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.create({
      leadId: input.leadId,
      pan: input.pan,
      aadhaar: input.aadhaar,
      documentsJson: input.documentsJson,
      riskProfile: input.riskProfile,
      investmentPreferencesJson: input.investmentPreferencesJson,
      consentAuditJson: input.consentAuditJson,
      authorId: user?.id,
    });
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => AccountApplicationEntity)
  updateAccountApplicationStatus(
    @Args('input') input: UpdateApplicationStatusInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateApplicationStatus(
      input.applicationId,
      input.status,
      input.remark,
      user?.id,
    );
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => AccountApplicationEntity)
  updateAccountKycStatus(
    @Args('input') input: UpdateKycStatusInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateKycStatus(input.applicationId, input.kyc, input.remark, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Query(() => [AccountApplicationEntity])
  accountApplicationsByLead(@Args('leadId', { type: () => ID }) leadId: string) {
    return this.service.findByLead(leadId);
  }
}
