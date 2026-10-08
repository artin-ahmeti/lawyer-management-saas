import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { MatterJurisdictionController } from './matter-jurisdiction.controller';
import { MatterJurisdictionService } from './matter-jurisdiction.service';
@Module({
  imports: [AuthModule],
  controllers: [ForumController, MatterJurisdictionController],
  providers: [ForumService, MatterJurisdictionService],
})
export class JurisdictionModule {}
