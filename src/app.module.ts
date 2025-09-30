import { Module } from '@nestjs/common';
import { PrismaAppModule } from 'prisma';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './app/auth/auth.module';
import { ApiConfigModule } from './app/core/config/config.module';
import { FirebaseModule } from './app/core/firebase/firebase.module';
import { GraphqlModule } from './app/core/graphql/graphql.module';
import './app/enums/app.enum';
import { IpkLeaddModule } from './app/lead/ipk-leadd.module';
import { UserModule } from './app/user/user-api.module';
import { UserApiService } from './app/user/user-api.service';

@Module({
  imports: [
    GraphqlModule,
    ApiConfigModule,
    PrismaAppModule,
    FirebaseModule,
    AuthModule,

    IpkLeaddModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserApiService],
})
export class AppModule { }
