import { Module } from '@nestjs/common';
import { StaffRoleController } from './staff-role.controller';
import { StaffRoleService } from './staff-role.service';
import { AuthModule } from '../auth/auth.module';
import { FirmController } from './firm.controller';
import { FirmService } from './firm.service';
import { FirmRecoveryService } from './firm-recovery.service';
import { FirmProvisionController } from './firm-provision.controller';
import { FirmProvisionService } from './firm-provision.service';
import { ProcessingReadinessService } from './processing-readiness.service';

@Module({
  imports: [AuthModule],
  controllers: [FirmController, FirmProvisionController, StaffRoleController],
  providers: [
    StaffRoleService,
    FirmService,
    FirmRecoveryService,
    FirmProvisionService,
    ProcessingReadinessService,
  ],
})
export class FirmModule {}
