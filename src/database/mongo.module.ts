import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { MONGO_CLIENT, MONGO_DB } from './mongo.constants';

@Global() // make available app-wide
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    {
      provide: MONGO_CLIENT,
      useFactory: async (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        if (!uri) throw new Error('MONGODB_URI is not set');

        const client = new MongoClient(uri, {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
        });

        await client.connect();

        // optional: ping to confirm
        await client.db('admin').command({ ping: 1 });

        return client;
      },
      inject: [ConfigService],
    },
    {
      provide: MONGO_DB,
      useFactory: (config: ConfigService, client: MongoClient) => {
        const dbName = config.get<string>('MONGODB_DBNAME') || 'ipkcrm';
        return client.db(dbName);
      },
      inject: [ConfigService, MONGO_CLIENT],
    },
  ],
  exports: [MONGO_CLIENT, MONGO_DB],
})
export class MongoModule {}
