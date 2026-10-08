import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatterFieldsController } from './matter-fields.controller';
import { MatterFieldsService } from './matter-fields.service';
import { PracticeProfileController } from './practice-profile.controller';
import { PracticeProfileService } from './practice-profile.service';
@Module({
  imports: [AuthModule],
  controllers: [PracticeProfileController, MatterFieldsController],
  providers: [PracticeProfileService, MatterFieldsService],
})
export class PracticeProfileModule {}
