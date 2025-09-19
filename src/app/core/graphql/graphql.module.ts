// src/app/core/graphql/graphql.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { environment } from '../../../environments/environment';

const isProd = !!environment.production;

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',
      autoSchemaFile: isProd ? true : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      introspection: true, // allows Apollo Sandbox & tools in dev
      csrfPrevention: false, // avoid 400 errors from CSRF plugin
    }),
  ],
  exports: [GraphQLModule],
})
export class GraphqlModule {}
