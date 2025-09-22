import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserApiService } from './app/user/user-api.service';
import { IpkLeaddModule } from './app/lead/ipk-leadd.module';
import { PrismaAppModule } from 'prisma';
import './app/enums/app.enum';
import { ApiConfigModule } from './app/core/config/config.module';
import { UserModule } from './app/user/user-api.module';
import { GraphqlModule } from './app/core/graphql/graphql.module';
import { FirebaseModule } from './app/core/firebase/firebase.module';
import { AuthModule } from './app/auth/auth.module';

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
