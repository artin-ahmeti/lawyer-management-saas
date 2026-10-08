import { Module } from '@nestjs/common';
import { StaffRoleController } from './staff-role.controller';
import { StaffRoleService } from './staff-role.service';
import { StaffMembershipController } from './staff-membership.controller';
import { StaffMembershipService } from './staff-membership.service';
import { AuthModule } from '../auth/auth.module';
import { FirmController } from './firm.controller';
import { FirmService } from './firm.service';
import { FirmRecoveryService } from './firm-recovery.service';
import { FirmProvisionController } from './firm-provision.controller';
import { FirmProvisionService } from './firm-provision.service';
import { ProcessingReadinessService } from './processing-readiness.service';

@Module({
  imports: [AuthModule],
  controllers: [
    FirmController,
    FirmProvisionController,
    StaffRoleController,
    StaffMembershipController,
  ],
  providers: [
    StaffRoleService,
    StaffMembershipService,
    FirmService,
    FirmRecoveryService,
    FirmProvisionService,
    ProcessingReadinessService,
  ],
})
export class FirmModule {}
