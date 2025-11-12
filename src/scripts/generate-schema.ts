// src/scripts/generate-schema.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { AppModule } from '../app.module';

async function run() {
  // Initialize the app so GraphQLModule can emit the schema
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  const schemaPath = join(process.cwd(), 'schema.gql');
  // Close immediately after initialization – no HTTP server needed
  await app.close();

  console.log(`GraphQL schema updated at: ${schemaPath}`);
}

run().catch((err) => {
  console.error('Failed to generate schema:', err);
  process.exit(1);
});
