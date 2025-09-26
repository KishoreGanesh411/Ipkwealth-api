import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import { hashPassword } from '../auth/password.util';
import { FIREBASE_ADMIN } from '../core/firebase/firebase-admin.provider';
import { FirebaseAuthUser } from '../core/firebase/firebase.types';
import { CreateUserInput } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserPayload, UserEntity } from './entities/user.entity';
import { Status as UserStatusEnum } from './enums/user.enums';

type ActiveDto = { active: boolean };

@Injectable()
export class UserApiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FIREBASE_ADMIN) private readonly firebase: typeof admin,
  ) { }

  /* ----------------------------- CREATE ----------------------------- */
  async createUser(input: CreateUserInput): Promise<CreateUserPayload> {
    const email = this.normalizeEmail(input.email);
    await this.assertEmailAvailable(email);

    const displayName = input.name.trim();
    let userRecord: admin.auth.UserRecord;

    try {
      userRecord = await this.firebase.auth().createUser({
        email,
        password: input.password,
        displayName,
        disabled: false,
      });
    } catch (error) {
      this.handleFirebaseCreateError(error);
    }

    const firebaseUid = userRecord.uid;
    const passwordHash = await hashPassword(input.password);
    const status = input.status ?? UserStatusEnum.ACTIVE;
    const archived = input.archived ?? false;

    try {
      const user = await this.prisma.user.create({
        data: {
          archived,
          name: displayName,
          email,
          role: input.role,
          gender: input.gender ?? null,
          phone: this.normalizePhone(input.phone),
          status,
          firebaseUid,
          passwordHash,
        },
      });

      return {
        success: true,
        message: 'User created',
        user: user as unknown as UserEntity,
      };
    } catch (error) {
      await this.safeDeleteFirebaseUser(firebaseUid);
      this.handlePrismaError(error);
    }

    throw new InternalServerErrorException('Failed to create user');
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      return await this.firebase.auth().generatePasswordResetLink(normalizedEmail);
    } catch (error) {
      this.handleFirebaseResetError(error);
    }

    throw new InternalServerErrorException('Failed to generate password reset link');
  }

  /* ------------------------------ UPDATE ---------------------------- */
  async updateUser(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email ? this.normalizeEmail(dto.email) : undefined,
        phone:
          dto.phone !== undefined ? this.normalizePhone(dto.phone) : undefined,
        gender: dto.gender,
        archived: dto.archived,
        role: dto.role ? { set: dto.role } : undefined,
        status: dto.status ? { set: dto.status } : undefined,
        firebaseUid: dto.firebaseUid,
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
      where: { archived: false, status: UserStatusEnum.ACTIVE },
      orderBy: { name: 'asc' },
    });
    return users as unknown as UserEntity[];
  }

  /* ----------------------------- TOGGLE ACTIVE ---------------------- */
  async updateUserActive(id: string, patch: ActiveDto): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: patch.active ? UserStatusEnum.ACTIVE : UserStatusEnum.INACTIVE,
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
      filters.push({ email: this.normalizeEmail(payload.email) });
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: filters },
    });

    const role = this.pickRole(payload.claims, existing?.role);
    const resolvedEmail = payload.email
      ? this.normalizeEmail(payload.email)
      : existing?.email ?? placeholderEmail;
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
          status: UserStatusEnum.ACTIVE,
        },
      });
      return user as unknown as UserEntity;
    }

    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));

    const created = await this.prisma.user.create({
      data: {
        firebaseUid: payload.firebaseUid,
        email: resolvedEmail,
        name: resolvedName,
        role,
        archived: false,
        status: UserStatusEnum.ACTIVE,
        passwordHash,
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

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    const trimmed = phone.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
  }

  private async safeDeleteFirebaseUser(firebaseUid: string): Promise<void> {
    try {
      await this.firebase.auth().deleteUser(firebaseUid);
    } catch {
      // Swallow cleanup failures; avoid hiding the original error.
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('User already exists with the provided identifier');
      }
    }

    throw new InternalServerErrorException('Failed to persist user');
  }

  private handleFirebaseCreateError(error: unknown): never {
    const code = this.extractFirebaseErrorCode(error);
    switch (code) {
      case 'auth/email-already-exists':
        throw new ConflictException('A Firebase user with this email already exists');
      case 'auth/invalid-email':
        throw new BadRequestException('Email address is invalid');
      case 'auth/weak-password':
      case 'auth/invalid-password':
        throw new BadRequestException('Password does not meet Firebase requirements');
      default:
        throw new InternalServerErrorException('Failed to create Firebase user');
    }
  }

  private handleFirebaseResetError(error: unknown): never {
    const code = this.extractFirebaseErrorCode(error);
    switch (code) {
      case 'auth/invalid-email':
        throw new BadRequestException('Email address is invalid');
      case 'auth/user-not-found':
        throw new NotFoundException('User not found in Firebase');
      default:
        throw new InternalServerErrorException('Failed to generate reset link');
    }
  }

  private extractFirebaseErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error && 'code' in error) {
      const code = (error as { code?: string }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }
}
