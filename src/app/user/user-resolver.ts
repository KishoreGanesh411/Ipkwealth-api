import { HttpException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { $Enums } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../core/firebase/firebase-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRoles } from './enums/user.enums';
import { IpkLeaddEntity } from '../lead/entities/ipk-leadd.model';
import { LeadStatus as GqlLeadStatus } from '../lead/enums/ipk-leadd.enum';
import { CreateUserInput } from './dto/create-user.dto';
import { InviteRmInput } from './dto/invite-rm.input';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserPayload, InviteRmPayload, SyncReport, UserEntity } from './entities/user.entity';
import { UserApiService } from './user-api.service';

function toGqlLeadStatus(s: $Enums.LeadStatus): GqlLeadStatus {
  switch (s) {
    case 'PENDING':
      return GqlLeadStatus.PENDING;
    case 'ASSIGNED':
      return GqlLeadStatus.ASSIGNED;
    case 'ON_HOLD':
      return GqlLeadStatus.ON_HOLD;
    case 'CLOSED':
      return GqlLeadStatus.CLOSED;
    case 'OPEN':
      return GqlLeadStatus.OPEN;
    default:
      return s as unknown as GqlLeadStatus;
  }
}

@Resolver(() => UserEntity)
export class UserResolver {
  constructor(
    private readonly users: UserApiService,
    private readonly prisma: PrismaService,
  ) {}

  // ?? This triggers Firebase verification + upsert; CurrentUser returns DB user
  @UseGuards(FirebaseAuthGuard)
  @Query(() => UserEntity)
  me(@CurrentUser() user: UserEntity) {
    return user;
  }

  // TODO: add role guard for admin-only access
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => CreateUserPayload)
  async createUser(@Args('input') input: CreateUserInput): Promise<CreateUserPayload> {
    try {
      return await this.users.createUser(input);
    } catch (error) {
      return {
        success: false,
        message: this.resolveErrorMessage(error, 'Failed to create user'),
        user: null,
      };
    }
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => String)
  async generatePasswordResetLink(
    @Args('email', { type: () => String }) email: string,
  ): Promise<string> {
    try {
      return await this.users.generatePasswordResetLink(email);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = this.resolveErrorMessage(error, 'Unable to generate password reset link');
      throw new Error(message);
    }
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Query(() => [UserEntity])
  async getUsers(
    @Args('withLeads', { type: () => Boolean, defaultValue: false })
    withLeads: boolean,
  ): Promise<UserEntity[]> {
    return withLeads ? this.users.getAllUserWithLeads() : this.users.getAllUser();
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Query(() => UserEntity, { nullable: true })
  async getUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('withLeads', { type: () => Boolean, defaultValue: false })
    withLeads: boolean,
  ) {
    return withLeads ? this.users.getUserWithLeads(id) : this.users.getUser(id);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => UserEntity)
  async updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.users.updateUser(id, input);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => InviteRmPayload)
  async inviteRm(@Args('input') input: InviteRmInput): Promise<InviteRmPayload> {
    return this.users.inviteRm(input);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => UserEntity)
  async makeAdmin(@Args('id', { type: () => ID }) id: string): Promise<UserEntity> {
    return this.users.makeAdmin(id);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => SyncReport)
  async syncUsersWithFirebase(): Promise<SyncReport> {
    return this.users.syncUsersWithFirebase();
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => UserEntity)
  async removeUser(@Args('id', { type: () => ID }) id: string) {
    return this.users.deleteUser(id);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Query(() => [UserEntity])
  async getActiveUsers(): Promise<UserEntity[]> {
    return this.users.getActiveUsers();
  }

  @ResolveField(() => [IpkLeaddEntity], {
    name: 'assignedLeads',
    nullable: 'itemsAndList',
  })
  async resolveAssignedLeads(@Parent() user: UserEntity): Promise<IpkLeaddEntity[]> {
    const rows = await this.prisma.ipkLeadd.findMany({
      where: { assignedRmId: user.id, archived: false },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      name: r.name ?? null,
      email: r.email ?? null,
      phone: r.phone,
      leadCode: r.leadCode ?? null,
      gender: r.gender ?? null,
      age: r.age ?? null,
      location: r.location ?? null,
      referralCode: r.referralCode ?? null,
      referralName: r.referralName ?? null,
      leadSource: r.leadSource,
      // single profession/companyName/designation removed; use occupations array
      occupations: r.occupations ?? null,
      product: r.product ?? null,
      investmentRange: r.investmentRange ?? null,
      sipAmount: r.sipAmount ?? null,
      clientTypes: r.clientTypes ?? null,
      remark: Array.isArray(r.remark)
        ? (r.remark as unknown as import('../lead/entities/remark.model').RemarkModel[])
        : undefined,
      history: (r.history as unknown) ?? null,
      assignedRmId: r.assignedRmId ?? null,
      assignedRM: r.assignedRM ?? null,
      firstSeenAt: r.firstSeenAt ?? null,
      lastSeenAt: r.lastSeenAt ?? null,
      reenterCount: r.reenterCount ?? 0,
      status: toGqlLeadStatus(r.status),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      archived: r.archived,
    }));
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpException) {
      return error.message;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }
}
