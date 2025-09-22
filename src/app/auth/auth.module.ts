// src/app/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { FirebaseModule } from '../core/firebase/firebase.module';
import { PrismaAppModule } from 'prisma/prisma.module'; // whatever exports PrismaService
import { GqlAuthGuard } from './gql-auth.guard';

@Module({
  imports: [FirebaseModule, PrismaAppModule],
  providers: [GqlAuthGuard],
  exports: [GqlAuthGuard], // so other modules can use the guard
})
export class AuthModule { }
