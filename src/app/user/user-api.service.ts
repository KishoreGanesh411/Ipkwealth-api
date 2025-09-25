import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { FirebaseAuthUser } from '../core/firebase/firebase.types';
import { Status } from '../enums/common.enum';
import { CreateUserInput } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

type ActiveDto = { active: boolean };

@Injectable()
export class UserApiService {
  constructor(private readonly prisma: PrismaService) { }

  /* ----------------------------- CREATE ----------------------------- */
  async createUser(dto: CreateUserInput): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        archived: false,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        gender: dto.gender,
        phone: dto.phone,
        status: dto.status ?? Status.ACTIVE,
        // If you added dto.firebaseUid in the DTO, you can persist it:
        firebaseUid: dto.firebaseUid ?? null,
      },
    });
    return user as unknown as UserEntity;
  }

  /* ------------------------------ UPDATE ---------------------------- */
  async updateUser(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        gender: dto.gender,
        archived: dto.archived,
        role: dto.role ? { set: dto.role } : undefined,
        status: dto.status ? { set: dto.status } : undefined,
        firebaseUid: dto.firebaseUid, // remains optional
      },
    });
    return user as unknown as UserEntity;
  }

  /* --------------------------- SOFT DELETE -------------------------- */
  async deleteUser(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { archived: true },
    });
    return user as unknown as UserEntity;
  }

  /* ------------------------------- LIST ----------------------------- */
  async getAllUser(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
    });
    return users as unknown as UserEntity[];
  }

  /* --------- OPTION A: include assignedLeads for bulk pages --------- */
  async getAllUserWithLeads(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
      include: {
        assignedLeads: {
          select: {
            id: true,
            leadCode: true,
            status: true,
            createdAt: true,
            assignedRM: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
    return users as unknown as UserEntity[];
  }

  async getUser(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, archived: false },
    });
    return user as unknown as UserEntity | null;
  }

  async getUserWithLeads(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        assignedLeads: {
          select: {
            id: true,
            leadCode: true,
            status: true,
            createdAt: true,
            assignedRM: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
      },
    });
    return user as unknown as UserEntity | null;
  }

  /* -------------------------- LIST ACTIVE ONLY ---------------------- */
  async getActiveUsers(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { archived: false, status: Status.ACTIVE },
      orderBy: { name: 'asc' },
    });
    return users as unknown as UserEntity[];
  }

  /* ----------------------------- TOGGLE ACTIVE ---------------------- */
  async updateUserActive(id: string, patch: ActiveDto): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: patch.active ? Status.ACTIVE : Status.INACTIVE,
      },
    });
    return user as unknown as UserEntity;
  }

  /* ---------------------------- FIREBASE HOOKS ---------------------- */
  async findByFirebaseUid(firebaseUid: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { firebaseUid, archived: false },
    });
    return user as unknown as UserEntity | null;
  }

  async upsertFromFirebase(payload: FirebaseAuthUser): Promise<UserEntity> {
    const placeholderEmail = `${payload.firebaseUid}@firebase.local`;

    const filters: Prisma.UserWhereInput[] = [{ firebaseUid: payload.firebaseUid }];
    if (payload.email) {
      filters.push({ email: payload.email });
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: filters },
    });

    const role = this.pickRole(payload.claims, existing?.role);
    const resolvedEmail = payload.email ?? existing?.email ?? placeholderEmail;
    const resolvedName = payload.name ?? existing?.name ?? resolvedEmail;

    if (existing) {
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firebaseUid: payload.firebaseUid,
          email: resolvedEmail,
          name: resolvedName,
          role,
          archived: false,
          status: Status.ACTIVE,
        },
      });
      return user as unknown as UserEntity;
    }

    const created = await this.prisma.user.create({
      data: {
        firebaseUid: payload.firebaseUid,
        email: resolvedEmail,
        name: resolvedName,
        role,
        archived: false,
        status: Status.ACTIVE,
      },
    });

    return created as unknown as UserEntity;
  }

  private pickRole(
    claims: FirebaseAuthUser['claims'],
    fallback?: $Enums.UserRoles | null,
  ): $Enums.UserRoles {
    const candidate =
      (claims.role as string | undefined) ??
      (Array.isArray(claims.roles) ? (claims.roles[0] as string | undefined) : undefined);

    if (candidate && (Object.values($Enums.UserRoles) as string[]).includes(candidate)) {
      return candidate as $Enums.UserRoles;
    }

    if (fallback) return fallback;

    return $Enums.UserRoles.STAFF;
  }
}
