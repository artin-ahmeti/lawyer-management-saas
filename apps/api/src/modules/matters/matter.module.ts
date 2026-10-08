import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatterController } from './matter.controller';
import { MatterService } from './matter.service';
import { MatterAccessController } from './matter-access.controller';
import { MatterAccessService } from './matter-access.service';
@Module({
  imports: [AuthModule],
  controllers: [MatterController, MatterAccessController],
  providers: [MatterService, MatterAccessService],
})
export class MatterModule {}
