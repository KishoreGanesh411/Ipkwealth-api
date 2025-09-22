import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserApiService } from './user-api.service';
import { UserResolver } from './user-resolver';
import { PrismaAppModule } from 'prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FirebaseModule } from '../core/firebase/firebase.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  providers: [PrismaAppModule, UserApiService, UserResolver],
  controllers: [UserController],
  exports: [UserApiService],
})
export class UserModule { }
