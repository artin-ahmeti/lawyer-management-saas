import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { AuthController } from './auth.controller';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { StaffMembershipService } from './staff-membership.service';
import { StaffFirmSelectionService } from './staff-firm-selection.service';

@Module({
  controllers: [AuthController],
  providers: [
    SupabaseAuthGuard,
    StaffAccessService,
    StaffMembershipService,
    StaffFirmSelectionService,
  ],
  exports: [SupabaseAuthGuard, StaffAccessService],
})
export class AuthModule {}
