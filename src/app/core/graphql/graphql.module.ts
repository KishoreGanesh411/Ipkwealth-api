// src/app/core/graphql/graphql.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { environment } from '../../../environments/environment';
import { GraphQLLoggingPlugin } from './plugins/graphql-logging.plugin';

const isProd = !!environment.production;

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',
      // Avoid writing schema inside `src/` because it triggers TypeScript
      // watchers and causes repeated rebuild/restarts in `nest start --watch`.
      // Write to project root in dev, and use in-memory schema in prod.
      autoSchemaFile: isProd ? true : join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      introspection: true, // allows Apollo Sandbox & tools in dev
      csrfPrevention: false, // avoid 400 errors from CSRF plugin
      plugins: isProd ? [] : [new GraphQLLoggingPlugin()],
      context: ({
        req,
        res,
      }: {
        req: import('express').Request;
        res: import('express').Response;
      }) => ({ req, res }),
    }),
  ],
  exports: [GraphQLModule],
})
export class GraphqlModule {}
