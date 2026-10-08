import type {
  StaffInvitationList,
  ReceivedInvitationList,
  CreateStaffInvitation,
  StaffInvitationCommandResult,
  FirmProfile,
  FirmExecutionList,
  RenameFirm,
  RenameFirmResult,
  ProcessingReadiness,
  StaffContext,
  StaffMembershipList,
  RecoverExecution,
  RecoverExecutionResult,
  ProvisionFirm,
  ProvisionFirmResult,
} from '@lawfirm/api-client';

export type InvitationRoleContractIsTyped = Assert<
  IsTyped<StaffInvitationList['items'][number]['role']>
>;
export type ReceivedInvitationContractIsTyped = Assert<IsTyped<ReceivedInvitationList>>;
export type InvitationInputContractIsTyped = Assert<IsTyped<CreateStaffInvitation>>;
export type InvitationReceiptContractIsTyped = Assert<IsTyped<StaffInvitationCommandResult>>;

// Also compiled by tsconfig.contracts.json, which checks dependency declarations.
type IsTyped<T> = 0 extends 1 & T ? false : true;
type Assert<T extends true> = T;
export type FirmReadContractIsTyped = Assert<IsTyped<FirmProfile>>;
export type FirmWriteContractIsTyped = Assert<IsTyped<RenameFirm>>;
export type FirmReceiptContractIsTyped = Assert<IsTyped<RenameFirmResult>>;

export type FirmExecutionContractIsTyped = Assert<
  IsTyped<FirmExecutionList['items'][number]['status']>
>;
export type ProcessingReadinessContractIsTyped = Assert<IsTyped<ProcessingReadiness['worker']>>;
export type StaffContextContractIsTyped = Assert<IsTyped<StaffContext['capabilities'][number]>>;
export type StaffMembershipRoleContractIsTyped = Assert<
  IsTyped<StaffMembershipList['items'][number]['role']>
>;
export type RecoveryInputContractIsTyped = Assert<IsTyped<RecoverExecution>>;
export type RecoveryReceiptContractIsTyped = Assert<IsTyped<RecoverExecutionResult>>;
export type ProvisionInputContractIsTyped = Assert<IsTyped<ProvisionFirm>>;
export type ProvisionReceiptContractIsTyped = Assert<IsTyped<ProvisionFirmResult>>;
