import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserInput } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { Status } from '../enums/common.enum';

type ActiveDto = { active: boolean };

@Injectable()
export class UserApiService {
  constructor(private readonly prisma: PrismaService) {}

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
        status: dto.status ?? 'ACTIVE',
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
          take: 100, // safety cap; tune per page
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
      where: { archived: false, status: 'ACTIVE' as Status },
      orderBy: { name: 'asc' },
    });
    return users as unknown as UserEntity[];
  }

  /* ----------------------------- TOGGLE ACTIVE ---------------------- */
  async updateUserActive(id: string, patch: ActiveDto): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: {
          set: (patch.active ? 'ACTIVE' : 'INACTIVE') as Status,
        },
      },
    });
    return user as unknown as UserEntity;
  }
}
