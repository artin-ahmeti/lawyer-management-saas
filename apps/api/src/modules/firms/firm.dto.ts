import {
  apiErrorSchema,
  firmExecutionListSchema,
  firmExecutionHistoryParamsSchema,
  firmExecutionHistorySchema,
  firmProfileSchema,
  processingReadinessSchema,
  renameFirmResultSchema,
  renameFirmSchema,
  recoverExecutionSchema,
  recoverExecutionResultSchema,
  recoveryReviewSchema,
  provisionFirmSchema,
  provisionFirmResultSchema,
} from '@lawfirm/core';
import { createZodDto } from 'nestjs-zod';

export class RenameFirmDto extends createZodDto(renameFirmSchema) {}
export class FirmProfileDto extends createZodDto(firmProfileSchema) {}
export class RenameFirmResultDto extends createZodDto(renameFirmResultSchema) {}
export class ApiErrorDto extends createZodDto(apiErrorSchema) {}

export class FirmExecutionListDto extends createZodDto(firmExecutionListSchema) {}
export class ProcessingReadinessDto extends createZodDto(processingReadinessSchema) {}
export class FirmExecutionHistoryParamsDto extends createZodDto(firmExecutionHistoryParamsSchema) {}
export class FirmExecutionHistoryDto extends createZodDto(firmExecutionHistorySchema) {}
export class RecoverExecutionDto extends createZodDto(recoverExecutionSchema) {}
export class RecoverExecutionResultDto extends createZodDto(recoverExecutionResultSchema) {}
export class RecoveryReviewDto extends createZodDto(recoveryReviewSchema) {}
export class ProvisionFirmDto extends createZodDto(provisionFirmSchema) {}
export class ProvisionFirmResultDto extends createZodDto(provisionFirmResultSchema) {}
