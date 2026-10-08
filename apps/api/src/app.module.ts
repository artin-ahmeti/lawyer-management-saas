import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './common/database/database.module';
import { FirmModule } from './modules/firms/firm.module';
import { StaffInvitationModule } from './modules/staff-invitations/staff-invitation.module';
import { MatterModule } from './modules/matters/matter.module';
import { ContactModule } from './modules/contacts/contact.module';
import { PracticeProfileModule } from './modules/practice-profiles/practice-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    HealthModule,
    AuthModule,
    DatabaseModule,
    FirmModule,
    StaffInvitationModule,
    MatterModule,
    ContactModule,
    PracticeProfileModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
