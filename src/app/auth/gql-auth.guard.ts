// src/app/auth/gql-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from '../core/firebase/firebase-admin.provider';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FIREBASE_ADMIN) private readonly fb: typeof admin,
  ) { }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const gqlCtx = GqlExecutionContext.create(ctx);
    const req = gqlCtx.getContext().req as {
      headers?: Record<string, string>;
      user?: unknown;
    };

    const auth = req.headers?.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return false;

    const decoded = await this.fb.auth().verifyIdToken(token);
    const user = await this.prisma.user.findFirst({
      where: { firebaseUid: decoded.uid, archived: false },
    });
    if (!user) return false;

    req.user = user;
    return true;
  }
}
