import { Inject, Injectable } from '@nestjs/common';
import * as config from '@nestjs/config';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';

import { DatabaseConfig } from '../config/database.config';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  constructor(
    @Inject(DatabaseConfig.KEY)
    private databaseConfig: config.ConfigType<typeof DatabaseConfig>,
  ) {}

  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: this.databaseConfig.host,
      // useNewUrlParser: true,
      // useCreateIndex: true,
      // useFindAndModify: false,
      // useUnifiedTopology: true,
    };
  }
}
