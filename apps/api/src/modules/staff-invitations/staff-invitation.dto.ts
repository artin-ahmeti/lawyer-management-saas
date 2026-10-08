import { createZodDto } from 'nestjs-zod';
import {
  createStaffInvitationSchema,
  invitationRevisionSchema,
  invitationParamsSchema,
  invitationCursorSchema,
  staffInvitationListSchema,
  receivedInvitationListSchema,
  staffInvitationCommandResultSchema,
} from '@lawfirm/core';
export class CreateStaffInvitationDto extends createZodDto(createStaffInvitationSchema) {}
export class InvitationRevisionDto extends createZodDto(invitationRevisionSchema) {}
export class InvitationParamsDto extends createZodDto(invitationParamsSchema) {}
export class InvitationCursorDto extends createZodDto(invitationCursorSchema) {}
export class StaffInvitationListDto extends createZodDto(staffInvitationListSchema) {}
export class ReceivedInvitationListDto extends createZodDto(receivedInvitationListSchema) {}
export class StaffInvitationCommandResultDto extends createZodDto(
  staffInvitationCommandResultSchema,
) {}
