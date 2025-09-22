import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UserApiService } from './user-api.service';
import { UserEntity } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'prisma/prisma.service';
import { IpkLeaddEntity } from '../lead/entities/ipk-leadd.model';
import { LeadStatus as GqlLeadStatus } from '../lead/enums/ipk-leadd.enum';
import { $Enums } from '@prisma/client';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
// import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';

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

  @UseGuards(GqlAuthGuard)
  @Query(() => UserEntity) // adjust to your GraphQL type
  me(@CurrentUser() user: any) {
    return user;
  }
  /* ----------------------------- CREATE ----------------------------- */
  @Mutation(() => UserEntity)
  async createUser(@Args('input') input: CreateUserInput) {
    return this.users.createUser(input);
  }

  /* --------------------------- READ: ALL ---------------------------- */
  @Query(() => [UserEntity])
  async getUsers(
    @Args('withLeads', { type: () => Boolean, defaultValue: false })
    withLeads: boolean,
  ): Promise<UserEntity[]> {
    return withLeads
      ? this.users.getAllUserWithLeads()
      : this.users.getAllUser();
  }

  /* --------------------------- READ: ONE ---------------------------- */
  @Query(() => UserEntity, { nullable: true })
  async getUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('withLeads', { type: () => Boolean, defaultValue: false })
    withLeads: boolean,
  ) {
    return withLeads ? this.users.getUserWithLeads(id) : this.users.getUser(id);
  }

  /* ----------------------------- UPDATE ---------------------------- */
  @Mutation(() => UserEntity)
  async updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.users.updateUser(id, input);
  }

  /* --------------------------- SOFT DELETE -------------------------- */
  @Mutation(() => UserEntity)
  async removeUser(@Args('id', { type: () => ID }) id: string) {
    return this.users.deleteUser(id);
  }

  /* ----------------------------- LIST ACTIVE ------------------------ */
  @Query(() => [UserEntity])
  async getActiveUsers(): Promise<UserEntity[]> {
    return this.users.getActiveUsers();
  }

  /* -------- Lazy field resolver for assignedLeads with enum mapping -------- */
  @ResolveField(() => [IpkLeaddEntity], {
    name: 'assignedLeads',
    nullable: 'itemsAndList',
  })
  async resolveAssignedLeads(
    @Parent() user: UserEntity,
  ): Promise<IpkLeaddEntity[]> {
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

      // NEW: expose these so other UIs that reuse this resolver also see them
      firstSeenAt: r.firstSeenAt ?? null,
      lastSeenAt: r.lastSeenAt ?? null,
      reenterCount: r.reenterCount ?? 0,

      status: toGqlLeadStatus(r.status),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      archived: r.archived,
    }));
  }
  // @Query(() => UserEntity)
  // @UseGuards(FirebaseAuthGuard, RolesGuard)
  // async currentUser(@Context('req') req) {
  //   const dbUser = req.user.dbUser;
  //   return dbUser;
  // }
}
