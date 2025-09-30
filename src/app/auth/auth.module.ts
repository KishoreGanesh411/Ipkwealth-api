import { forwardRef, Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma/prisma.module';
import { FirebaseAuthGuard } from '../core/firebase/firebase-auth.guard';
import { FirebaseModule } from '../core/firebase/firebase.module';
import { UserModule } from '../user/user-api.module';
import { GqlAuthGuard } from './gql-auth.guard';

@Module({
  imports: [FirebaseModule, PrismaAppModule, forwardRef(() => UserModule)],
  providers: [FirebaseAuthGuard, GqlAuthGuard],
  exports: [FirebaseAuthGuard, GqlAuthGuard],
})
export class AuthModule {}
