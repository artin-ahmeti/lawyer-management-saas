import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MatterPartyController } from './matter-party.controller';
import { MatterPartyService } from './matter-party.service';
@Module({
  imports: [AuthModule],
  controllers: [ContactController, MatterPartyController],
  providers: [ContactService, MatterPartyService],
})
export class ContactModule {}
