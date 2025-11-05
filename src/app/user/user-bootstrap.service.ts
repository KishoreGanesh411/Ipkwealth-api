import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UserApiService } from './user-api.service';
import { UserRoles } from './enums/user.enums';

@Injectable()
export class UserBootstrapService implements OnModuleInit {
  private readonly log = new Logger(UserBootstrapService.name);

  constructor(private readonly prisma: PrismaService, private readonly users: UserApiService) {}

  async onModuleInit() {
    try {
      const total = await this.prisma.user.count();
      if (total > 0) return;

      const email = 'prabhukumarasamy@ipkwealth.com';
      const password = 'ppasswordipk@2025';

      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) return;

      await this.users.createUser({
        name: 'Administrator',
        email,
        password,
        role: UserRoles.ADMIN,
        archived: false,
      });

      this.log.log('Default ADMIN user created');
    } catch (e) {
      this.log.error('Failed to bootstrap default admin', e as Error);
    }
  }
}
