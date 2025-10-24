import { forwardRef, Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../core/firebase/firebase.module';
import { UserController } from './user.controller';
import { UserApiService } from './user-api.service';
import { UserResolver } from './user-resolver';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [PrismaAppModule, FirebaseModule, forwardRef(() => AuthModule)],
  providers: [UserApiService, UserResolver, RolesGuard],
  controllers: [UserController],
  exports: [UserApiService],
})
export class UserModule {}
