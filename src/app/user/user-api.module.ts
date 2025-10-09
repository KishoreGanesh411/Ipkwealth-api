import { forwardRef, Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../core/firebase/firebase.module';
import { UserController } from './user.controller';
import { UserApiService } from './user-api.service';
import { UserResolver } from './user-resolver';

@Module({
  imports: [PrismaAppModule, FirebaseModule, forwardRef(() => AuthModule)],
  providers: [UserApiService, UserResolver],
  controllers: [UserController],
  exports: [UserApiService],
})
export class UserModule {}
