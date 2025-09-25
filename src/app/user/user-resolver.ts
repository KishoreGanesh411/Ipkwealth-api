import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { $Enums } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../core/firebase/firebase-auth.guard';
import { IpkLeaddEntity } from '../lead/entities/ipk-leadd.model';
import { LeadStatus as GqlLeadStatus } from '../lead/enums/ipk-leadd.enum';
import { CreateUserInput } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
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
  ) { }

  // 🔐 This triggers Firebase verification + upsert; CurrentUser returns DB user
  @UseGuards(FirebaseAuthGuard)
  @Query(() => UserEntity)
  async me(@CurrentUser() user: UserEntity) {
    return user;
  }

  // Public admin create (add an admin-only guard if needed)
  @Mutation(() => UserEntity)
  async createUser(@Args('input') input: CreateUserInput) {
    return this.users.createUser(input);
  }

  @Query(() => [UserEntity])
  async getUsers(
    @Args('withLeads', { type: () => Boolean, defaultValue: false })
    withLeads: boolean,
  ): Promise<UserEntity[]> {
    return withLeads ? this.users.getAllUserWithLeads() : this.users.getAllUser();
  }

  @Query(() => UserEntity, { nullable: true })
  async getUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('withLeads', { type: () => Boolean, defaultValue: false })
    withLeads: boolean,
  ) {
    return withLeads ? this.users.getUserWithLeads(id) : this.users.getUser(id);
  }

  @Mutation(() => UserEntity)
  async updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.users.updateUser(id, input);
  }

  @Mutation(() => UserEntity)
  async removeUser(@Args('id', { type: () => ID }) id: string) {
    return this.users.deleteUser(id);
  }

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
      leadSource: r.leadSource,
      profession: r.profession ?? null,
      companyName: r.companyName ?? null,
      designation: r.designation ?? null,
      product: r.product ?? null,
      investmentRange: r.investmentRange ?? null,
      sipAmount: r.sipAmount ?? null,
      clientTypes: r.clientTypes ?? null,
      remark: r.remark ?? null,
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
}
