import {
  apiErrorSchema,
  staffContextSchema,
  staffMembershipCursorSchema,
  staffMembershipListSchema,
  activeFirmSelectionSchema,
  selectStaffFirmSchema,
  selectStaffFirmResultSchema,
} from '@lawfirm/core';
import { createZodDto } from 'nestjs-zod';
export class StaffContextDto extends createZodDto(staffContextSchema) {}
export class StaffMembershipCursorDto extends createZodDto(staffMembershipCursorSchema) {}
export class StaffMembershipListDto extends createZodDto(staffMembershipListSchema) {}
export class StaffAuthErrorDto extends createZodDto(apiErrorSchema) {}
export class ActiveFirmSelectionDto extends createZodDto(activeFirmSelectionSchema) {}
export class SelectStaffFirmDto extends createZodDto(selectStaffFirmSchema) {}
export class SelectStaffFirmResultDto extends createZodDto(selectStaffFirmResultSchema) {}
