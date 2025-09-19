import { registerAs } from '@nestjs/config';

// import { environment } from '../../../environments/environment';

export const DatabaseConfig = registerAs('database', () => {
  return {
    host: process.env.DATABASE_URL,
  };
});
