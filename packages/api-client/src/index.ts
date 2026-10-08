import type { paths } from './generated/schema.js';

export const API_CLIENT_VERSION = '0.0.1';
export type FirmStaffList =
  paths['/firms/current/staff']['get']['responses'][200]['content']['application/json'];
export type StaffRoleHistory =
  paths['/firms/current/staff/history']['get']['responses'][200]['content']['application/json'];
export type ChangeStaffRole = NonNullable<
  paths['/firms/current/staff/role-changes']['post']['requestBody']
>['content']['application/json'];
export type ChangeStaffRoleResult =
  paths['/firms/current/staff/role-changes']['post']['responses'][200]['content']['application/json'];
export type RemovedStaffList =
  paths['/firms/current/staff/removed']['get']['responses'][200]['content']['application/json'];
export type StaffMembershipHistory =
  paths['/firms/current/staff/membership-history']['get']['responses'][200]['content']['application/json'];
export type RemoveStaffMembership = NonNullable<
  paths['/firms/current/staff/removals']['post']['requestBody']
>['content']['application/json'];
export type RestoreStaffMembership = NonNullable<
  paths['/firms/current/staff/restorations']['post']['requestBody']
>['content']['application/json'];
export type StaffMembershipResult =
  paths['/firms/current/staff/removals']['post']['responses'][200]['content']['application/json'];

export type MatterAccessList =
  paths['/matters/{matterId}/access']['get']['responses'][200]['content']['application/json'];
export type MatterAccessCandidates =
  paths['/matters/{matterId}/access-candidates']['get']['responses'][200]['content']['application/json'];
export type MatterAccessHistory =
  paths['/matters/{matterId}/access-history']['get']['responses'][200]['content']['application/json'];
export type ChangeMatterAccess = NonNullable<
  paths['/matters/{matterId}/access-changes']['post']['requestBody']
>['content']['application/json'];
export type ChangeMatterAccessResult =
  paths['/matters/{matterId}/access-changes']['post']['responses'][200]['content']['application/json'];
export type MatterRecord =
  paths['/matters/{matterId}']['get']['responses'][200]['content']['application/json'];
export type MatterList = paths['/matters']['get']['responses'][200]['content']['application/json'];
export type CreateMatter = NonNullable<
  paths['/matters']['post']['requestBody']
>['content']['application/json'];
export type CreateMatterResult =
  paths['/matters']['post']['responses'][201]['content']['application/json'];
export type ContactList =
  paths['/contacts']['get']['responses'][200]['content']['application/json'];
export type ContactListQuery = { q?: string; afterName?: string; afterId?: string };
export type ContactDetail =
  paths['/contacts/{contactId}']['get']['responses'][200]['content']['application/json'];
export type ContactMatterList =
  paths['/contacts/{contactId}/matters']['get']['responses'][200]['content']['application/json'];
export type CreateContact = NonNullable<
  paths['/contacts']['post']['requestBody']
>['content']['application/json'];
export type UpdateContact = NonNullable<
  paths['/contacts/{contactId}']['patch']['requestBody']
>['content']['application/json'];
export type ContactResult =
  paths['/contacts']['post']['responses'][201]['content']['application/json'];
export type MatterPartyList =
  paths['/matters/{matterId}/parties']['get']['responses'][200]['content']['application/json'];
export type AddMatterParty = NonNullable<
  paths['/matters/{matterId}/parties']['post']['requestBody']
>['content']['application/json'];
export type EndMatterParty = NonNullable<
  paths['/matters/{matterId}/party-endings']['post']['requestBody']
>['content']['application/json'];
export type MatterPartyResult =
  paths['/matters/{matterId}/parties']['post']['responses'][201]['content']['application/json'];
export type PracticeProfileList =
  paths['/practice-profiles']['get']['responses'][200]['content']['application/json'];
export type PracticeProfileListQuery = {
  status?: 'active' | 'archived';
  afterName?: string;
  afterId?: string;
};
export type PracticeProfileDetail =
  paths['/practice-profiles/{profileId}']['get']['responses'][200]['content']['application/json'];
export type CreatePracticeProfile = NonNullable<
  paths['/practice-profiles']['post']['requestBody']
>['content']['application/json'];
export type RevisePracticeProfile = NonNullable<
  paths['/practice-profiles/{profileId}']['patch']['requestBody']
>['content']['application/json'];
export type PracticeProfileResult =
  paths['/practice-profiles']['post']['responses'][201]['content']['application/json'];
export type MatterFields =
  paths['/matters/{matterId}/fields']['get']['responses'][200]['content']['application/json'];
export type UpdateMatterFields = NonNullable<
  paths['/matters/{matterId}/fields']['patch']['requestBody']
>['content']['application/json'];
export type MatterFieldsResult =
  paths['/matters/{matterId}/fields']['patch']['responses'][200]['content']['application/json'];
export type ForumList = paths['/forums']['get']['responses'][200]['content']['application/json'];
/** The generated query, so the jurisdiction filter is the catalog enum, not any string. */
export type ForumListQuery = NonNullable<paths['/forums']['get']['parameters']['query']>;
export type CreateForum = NonNullable<
  paths['/forums']['post']['requestBody']
>['content']['application/json'];
export type UpdateForum = NonNullable<
  paths['/forums/{forumId}']['patch']['requestBody']
>['content']['application/json'];
export type ForumResult = paths['/forums']['post']['responses'][201]['content']['application/json'];
export type MatterJurisdictionList =
  paths['/matters/{matterId}/jurisdictions']['get']['responses'][200]['content']['application/json'];
export type AddMatterJurisdiction = NonNullable<
  paths['/matters/{matterId}/jurisdictions']['post']['requestBody']
>['content']['application/json'];
export type EndMatterJurisdiction = NonNullable<
  paths['/matters/{matterId}/jurisdiction-endings']['post']['requestBody']
>['content']['application/json'];
export type MatterJurisdictionResult =
  paths['/matters/{matterId}/jurisdictions']['post']['responses'][201]['content']['application/json'];
export type StaffInvitationList =
  paths['/firms/current/staff-invitations']['get']['responses'][200]['content']['application/json'];
export type ReceivedInvitationList =
  paths['/staff-invitations/received']['get']['responses'][200]['content']['application/json'];
export type CreateStaffInvitation = NonNullable<
  paths['/firms/current/staff-invitations']['post']['requestBody']
>['content']['application/json'];
export type InvitationRevision = NonNullable<
  paths['/staff-invitations/{invitationId}/acceptance']['post']['requestBody']
>['content']['application/json'];
export type StaffInvitationCommandResult =
  paths['/staff-invitations/{invitationId}/acceptance']['post']['responses'][200]['content']['application/json'];
type InvitationCursor = { beforeId: string; beforeCreatedAt: string } | null;
type Action = { idempotencyKey: string; requestId: string; signal?: AbortSignal };
const invitationPage = (cursor: InvitationCursor) =>
  cursor ? `?${new URLSearchParams(cursor)}` : '';
export type ProvisionFirm = NonNullable<
  paths['/firms']['post']['requestBody']
>['content']['application/json'];
export type ProvisionFirmResult =
  paths['/firms']['post']['responses'][200]['content']['application/json'];
export type StaffContext =
  paths['/auth/me']['get']['responses'][200]['content']['application/json'];
export type StaffMembershipList =
  paths['/auth/memberships']['get']['responses'][200]['content']['application/json'];
export type ActiveFirmSelection =
  paths['/auth/active-firm']['get']['responses'][200]['content']['application/json'];
export type SelectStaffFirm = NonNullable<
  paths['/auth/active-firm']['post']['requestBody']
>['content']['application/json'];
export type SelectStaffFirmResult =
  paths['/auth/active-firm']['post']['responses'][200]['content']['application/json'];
export type FirmProfile =
  paths['/firms/current']['get']['responses'][200]['content']['application/json'];
export type FirmExecutionList =
  paths['/firms/current/executions']['get']['responses'][200]['content']['application/json'];
export type FirmExecutionHistory =
  paths['/firms/current/executions/{jobId}/attempts']['get']['responses'][200]['content']['application/json'];
export type ProcessingReadiness =
  paths['/firms/current/processing-readiness']['get']['responses'][200]['content']['application/json'];
export type RecoveryReview =
  paths['/firms/current/executions/{jobId}/recovery']['get']['responses'][200]['content']['application/json'];
export type RecoverExecution = NonNullable<
  paths['/firms/current/executions/{jobId}/recovery']['post']['requestBody']
>['content']['application/json'];
export type RecoverExecutionResult =
  paths['/firms/current/executions/{jobId}/recovery']['post']['responses'][200]['content']['application/json'];
export type RenameFirm = NonNullable<
  paths['/firms/current/name']['patch']['requestBody']
>['content']['application/json'];
export type RenameFirmResult =
  paths['/firms/current/name']['patch']['responses'][200]['content']['application/json'];

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ClientOptions = {
  baseUrl: string;
  accessToken: () => Promise<string | null>;
  /** Injectable transport supports native fetch and focused client contract tests. */
  fetch?: typeof globalThis.fetch;
};

/** No implicit write retries: callers retain an action key across an uncertain result. */
export function createApiClient(options: ClientOptions) {
  const transport = options.fetch ?? globalThis.fetch;
  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const token = await options.accessToken();
    if (!token) throw new ApiError(401, 'SESSION_REQUIRED', 'Sign in to continue.');
    const response = await transport(`${options.baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error =
        typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
      throw new ApiError(
        response.status,
        typeof error.code === 'string' ? error.code : `HTTP_${response.status}`,
        typeof error.message === 'string' ? error.message : 'The request could not be completed.',
        response.headers.get('X-Request-Id') ?? undefined,
      );
    }
    // Generated OpenAPI types describe the wire contract; consumers validate data at their boundary.
    return body as T;
  }
  const invitationCommand = (
    path: string,
    input: CreateStaffInvitation | InvitationRevision,
    action: Action,
  ) =>
    request<StaffInvitationCommandResult>(path, {
      method: 'POST',
      signal: action.signal,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': action.idempotencyKey,
        'X-Request-Id': action.requestId,
      },
      body: JSON.stringify(input),
    });
  const keyed = <T>(path: string, method: 'POST' | 'PATCH', input: unknown, action: Action) =>
    request<T>(path, {
      method,
      signal: action.signal,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': action.idempotencyKey,
        'X-Request-Id': action.requestId,
      },
      body: JSON.stringify(input),
    });
  return {
    firmStaff: (signal?: AbortSignal, afterId?: string) =>
      request<FirmStaffList>(
        `/firms/current/staff${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`,
        { signal },
      ),
    staffRoleHistory: (signal?: AbortSignal, cursor: InvitationCursor = null) =>
      request<StaffRoleHistory>(`/firms/current/staff/history${invitationPage(cursor)}`, {
        signal,
      }),
    changeStaffRole: (input: ChangeStaffRole, action: Action) =>
      request<ChangeStaffRoleResult>('/firms/current/staff/role-changes', {
        method: 'POST',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
    removedStaff: (signal?: AbortSignal, afterId?: string) =>
      request<RemovedStaffList>(
        `/firms/current/staff/removed${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`,
        { signal },
      ),
    staffMembershipHistory: (signal?: AbortSignal, cursor: InvitationCursor = null) =>
      request<StaffMembershipHistory>(
        `/firms/current/staff/membership-history${invitationPage(cursor)}`,
        { signal },
      ),
    removeStaffMembership: (input: RemoveStaffMembership, action: Action) =>
      request<StaffMembershipResult>('/firms/current/staff/removals', {
        method: 'POST',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
    restoreStaffMembership: (input: RestoreStaffMembership, action: Action) =>
      request<StaffMembershipResult>('/firms/current/staff/restorations', {
        method: 'POST',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
    matterAccess: (id: string, signal?: AbortSignal, afterId?: string) =>
      request<MatterAccessList>(
        `/matters/${encodeURIComponent(id)}/access${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`,
        { signal },
      ),
    matterAccessCandidates: (id: string, signal?: AbortSignal, afterId?: string) =>
      request<MatterAccessCandidates>(
        `/matters/${encodeURIComponent(id)}/access-candidates${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`,
        { signal },
      ),
    matterAccessHistory: (id: string, signal?: AbortSignal, cursor: InvitationCursor = null) =>
      request<MatterAccessHistory>(
        `/matters/${encodeURIComponent(id)}/access-history${invitationPage(cursor)}`,
        { signal },
      ),
    changeMatterAccess: (id: string, input: ChangeMatterAccess, action: Action) =>
      request<ChangeMatterAccessResult>(`/matters/${encodeURIComponent(id)}/access-changes`, {
        method: 'POST',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
    matters: (signal?: AbortSignal, afterId?: string) =>
      request<MatterList>(`/matters${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`, {
        signal,
      }),
    matter: (id: string, signal?: AbortSignal) =>
      request<MatterRecord>(`/matters/${encodeURIComponent(id)}`, { signal }),
    createMatter: (input: CreateMatter, action: Action) =>
      request<CreateMatterResult>('/matters', {
        method: 'POST',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
    contacts: (query: ContactListQuery = {}, signal?: AbortSignal) => {
      const params = new URLSearchParams(
        Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
      );
      return request<ContactList>(`/contacts${params.size ? `?${params}` : ''}`, { signal });
    },
    contact: (id: string, signal?: AbortSignal) =>
      request<ContactDetail>(`/contacts/${encodeURIComponent(id)}`, { signal }),
    contactMatters: (id: string, signal?: AbortSignal, afterId?: string) =>
      request<ContactMatterList>(
        `/contacts/${encodeURIComponent(id)}/matters${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`,
        { signal },
      ),
    createContact: (input: CreateContact, action: Action) =>
      keyed<ContactResult>('/contacts', 'POST', input, action),
    updateContact: (id: string, input: UpdateContact, action: Action) =>
      keyed<ContactResult>(`/contacts/${encodeURIComponent(id)}`, 'PATCH', input, action),
    matterParties: (id: string, signal?: AbortSignal, afterId?: string) =>
      request<MatterPartyList>(
        `/matters/${encodeURIComponent(id)}/parties${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`,
        { signal },
      ),
    addMatterParty: (id: string, input: AddMatterParty, action: Action) =>
      keyed<MatterPartyResult>(`/matters/${encodeURIComponent(id)}/parties`, 'POST', input, action),
    endMatterParty: (id: string, input: EndMatterParty, action: Action) =>
      keyed<MatterPartyResult>(
        `/matters/${encodeURIComponent(id)}/party-endings`,
        'POST',
        input,
        action,
      ),
    practiceProfiles: (query: PracticeProfileListQuery = {}, signal?: AbortSignal) => {
      const params = new URLSearchParams(
        Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
      );
      return request<PracticeProfileList>(`/practice-profiles${params.size ? `?${params}` : ''}`, {
        signal,
      });
    },
    practiceProfile: (id: string, signal?: AbortSignal) =>
      request<PracticeProfileDetail>(`/practice-profiles/${encodeURIComponent(id)}`, { signal }),
    createPracticeProfile: (input: CreatePracticeProfile, action: Action) =>
      keyed<PracticeProfileResult>('/practice-profiles', 'POST', input, action),
    revisePracticeProfile: (id: string, input: RevisePracticeProfile, action: Action) =>
      keyed<PracticeProfileResult>(
        `/practice-profiles/${encodeURIComponent(id)}`,
        'PATCH',
        input,
        action,
      ),
    matterFields: (id: string, signal?: AbortSignal) =>
      request<MatterFields>(`/matters/${encodeURIComponent(id)}/fields`, { signal }),
    updateMatterFields: (id: string, input: UpdateMatterFields, action: Action) =>
      keyed<MatterFieldsResult>(
        `/matters/${encodeURIComponent(id)}/fields`,
        'PATCH',
        input,
        action,
      ),
    forums: (query: ForumListQuery = {}, signal?: AbortSignal) => {
      const params = new URLSearchParams(
        Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
      );
      return request<ForumList>(`/forums${params.size ? `?${params}` : ''}`, { signal });
    },
    createForum: (input: CreateForum, action: Action) =>
      keyed<ForumResult>('/forums', 'POST', input, action),
    updateForum: (id: string, input: UpdateForum, action: Action) =>
      keyed<ForumResult>(`/forums/${encodeURIComponent(id)}`, 'PATCH', input, action),
    matterJurisdictions: (id: string, signal?: AbortSignal) =>
      request<MatterJurisdictionList>(`/matters/${encodeURIComponent(id)}/jurisdictions`, {
        signal,
      }),
    addMatterJurisdiction: (id: string, input: AddMatterJurisdiction, action: Action) =>
      keyed<MatterJurisdictionResult>(
        `/matters/${encodeURIComponent(id)}/jurisdictions`,
        'POST',
        input,
        action,
      ),
    endMatterJurisdiction: (id: string, input: EndMatterJurisdiction, action: Action) =>
      keyed<MatterJurisdictionResult>(
        `/matters/${encodeURIComponent(id)}/jurisdiction-endings`,
        'POST',
        input,
        action,
      ),
    activeFirmSelection: (signal?: AbortSignal) =>
      request<ActiveFirmSelection>('/auth/active-firm', { signal }),
    selectStaffFirm: (input: SelectStaffFirm, action: Action) =>
      request<SelectStaffFirmResult>('/auth/active-firm', {
        method: 'POST',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
    staffInvitations: (cursor: InvitationCursor = null, signal?: AbortSignal) =>
      request<StaffInvitationList>(`/firms/current/staff-invitations${invitationPage(cursor)}`, {
        signal,
      }),
    receivedInvitations: (cursor: InvitationCursor = null, signal?: AbortSignal) =>
      request<ReceivedInvitationList>(`/staff-invitations/received${invitationPage(cursor)}`, {
        signal,
      }),
    prepareStaffInvitation: (input: CreateStaffInvitation, action: Action) =>
      invitationCommand('/firms/current/staff-invitations', input, action),
    revokeStaffInvitation: (id: string, input: InvitationRevision, action: Action) =>
      invitationCommand(
        `/firms/current/staff-invitations/${encodeURIComponent(id)}/revocation`,
        input,
        action,
      ),
    acceptStaffInvitation: (id: string, input: InvitationRevision, action: Action) =>
      invitationCommand(`/staff-invitations/${encodeURIComponent(id)}/acceptance`, input, action),
    provisionFirm: (
      input: ProvisionFirm,
      action: { idempotencyKey: string; requestId: string; signal?: AbortSignal },
    ) =>
      request<ProvisionFirmResult>('/firms', {
        method: 'POST',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
    staffContext: (signal?: AbortSignal) => request<StaffContext>('/auth/me', { signal }),
    staffMemberships: (afterId?: string, signal?: AbortSignal) =>
      request<StaffMembershipList>(
        `/auth/memberships${afterId ? `?${new URLSearchParams({ afterId })}` : ''}`,
        { signal },
      ),
    firm: (signal?: AbortSignal) => request<FirmProfile>('/firms/current', { signal }),
    firmExecutions: (signal?: AbortSignal) =>
      request<FirmExecutionList>('/firms/current/executions', { signal }),
    executionHistory: (jobId: string, signal?: AbortSignal) =>
      request<FirmExecutionHistory>(
        `/firms/current/executions/${encodeURIComponent(jobId)}/attempts`,
        { signal },
      ),
    processingReadiness: (signal?: AbortSignal) =>
      request<ProcessingReadiness>('/firms/current/processing-readiness', { signal }),
    recoveryReview: (jobId: string, signal?: AbortSignal) =>
      request<RecoveryReview>(`/firms/current/executions/${encodeURIComponent(jobId)}/recovery`, {
        signal,
      }),
    recoverExecution: (
      jobId: string,
      input: RecoverExecution,
      action: { idempotencyKey: string; requestId: string; signal?: AbortSignal },
    ) =>
      request<RecoverExecutionResult>(
        `/firms/current/executions/${encodeURIComponent(jobId)}/recovery`,
        {
          method: 'POST',
          signal: action.signal,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': action.idempotencyKey,
            'X-Request-Id': action.requestId,
          },
          body: JSON.stringify(input),
        },
      ),
    renameFirm: (
      input: RenameFirm,
      action: { idempotencyKey: string; requestId: string; signal?: AbortSignal },
    ) =>
      request<RenameFirmResult>('/firms/current/name', {
        method: 'PATCH',
        signal: action.signal,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': action.idempotencyKey,
          'X-Request-Id': action.requestId,
        },
        body: JSON.stringify(input),
      }),
  };
}
