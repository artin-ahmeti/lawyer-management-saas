import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import postgres from 'postgres';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly sql: postgres.Sql;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL is required for server commands');
    this.sql = postgres(url, {
      max: 10,
      connect_timeout: 5,
      idle_timeout: 20,
      connection: { statement_timeout: 5000, application_name: 'clepso-api' },
    });
  }

  async onApplicationShutdown() {
    await this.sql.end({ timeout: 5 });
  }
}

@Global()
@Module({ providers: [DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
