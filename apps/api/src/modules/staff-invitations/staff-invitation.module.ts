import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffInvitationController } from './staff-invitation.controller';
import { StaffInvitationService } from './staff-invitation.service';
@Module({
  imports: [AuthModule],
  controllers: [StaffInvitationController],
  providers: [StaffInvitationService],
})
export class StaffInvitationModule {}
