import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserApiService } from '../app/user/user-api.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const users = app.get(UserApiService);
    const report = await users.syncUsersWithFirebase();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Sync failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();

