import { Injectable, NotFoundException } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class RmService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveRms() {
    const rms = await this.prisma.user.findMany({
      where: {
        role: $Enums.UserRoles.RM,
        archived: false,
        status: $Enums.Status.ACTIVE,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        lastAssignedAt: true,
      },
    });

    const withCounts = await Promise.all(
      rms.map(async (rm) => {
        const [openAssigned, totalAssigned] = await Promise.all([
          this.prisma.ipkLeadd.count({
            where: {
              assignedRmId: rm.id,
              archived: false,
              status: { not: $Enums.LeadStatus.CLOSED },
            },
          }),
          this.prisma.ipkLeadd.count({
            where: {
              assignedRmId: rm.id,
              archived: false,
            },
          }),
        ]);

        return {
          ...rm,
          leadCounts: {
            open: openAssigned,
            total: totalAssigned,
          },
        };
      }),
    );

    return withCounts;
  }

  async getRm(rmId: string) {
    const rm = await this.prisma.user.findFirst({
      where: {
        id: rmId,
        role: $Enums.UserRoles.RM,
        archived: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        lastAssignedAt: true,
      },
    });

    if (!rm) {
      throw new NotFoundException('Relationship manager not found');
    }

    const [openAssigned, totalAssigned] = await Promise.all([
      this.prisma.ipkLeadd.count({
        where: {
          assignedRmId: rm.id,
          archived: false,
          status: { not: $Enums.LeadStatus.CLOSED },
        },
      }),
      this.prisma.ipkLeadd.count({
        where: {
          assignedRmId: rm.id,
          archived: false,
        },
      }),
    ]);

    return {
      ...rm,
      leadCounts: {
        open: openAssigned,
        total: totalAssigned,
      },
    };
  }

  async getRmLeads(rmId: string, includeArchived = false) {
    const rmExists = await this.prisma.user.findFirst({
      where: {
        id: rmId,
        role: $Enums.UserRoles.RM,
        archived: false,
      },
      select: { id: true },
    });

    if (!rmExists) {
      throw new NotFoundException('Relationship manager not found');
    }

    return this.prisma.ipkLeadd.findMany({
      where: {
        assignedRmId: rmId,
        archived: includeArchived ? undefined : false,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        leadCode: true,
        leadSource: true,
        status: true,
        clientStage: true,
        updatedAt: true,
        archived: true,
      },
    });
  }
}
