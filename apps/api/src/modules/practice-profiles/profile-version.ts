import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  applyFieldValues,
  practiceFieldListSchema,
  type PracticeFieldPatch,
  type PracticeFieldValues,
} from '@lawfirm/core';
import type postgres from 'postgres';

/** A version with the profile identity it belongs to (D022). */
export type ProfileVersionRow = {
  version_id: string;
  version: number;
  fields: unknown;
  version_created_at: Date;
  profile_id: string;
  name: string;
  archived_at: Date | null;
  current_version: number;
};
export const profileUnavailable = () =>
  new NotFoundException({
    code: 'PROFILE_UNAVAILABLE',
    message: 'This practice profile is unavailable.',
  });

/** Reads any version of the firm, archived or not; versions are immutable, so no lock. */
export async function profileVersion(
  tx: postgres.TransactionSql,
  firmId: string,
  versionId: string,
) {
  const [row] = await tx<ProfileVersionRow[]>`select v.id as version_id,v.version,v.fields,
      v.created_at as version_created_at,p.id as profile_id,p.name,p.archived_at,p.current_version
    from practice_profile_versions v join practice_profiles p on p.firm_id=v.firm_id and p.id=v.profile_id
    where v.firm_id=${firmId} and v.id=${versionId} and v.deleted_at is null and p.deleted_at is null`;
  return row;
}

/**
 * New work (matter creation or a first assignment) uses only the current version of an
 * active profile. The profile row is share-locked so a revision or archive waits.
 */
export async function versionForNewWork(
  tx: postgres.TransactionSql,
  firmId: string,
  versionId: string,
) {
  const [row] = await tx<ProfileVersionRow[]>`select v.id as version_id,v.version,v.fields,
      v.created_at as version_created_at,p.id as profile_id,p.name,p.archived_at,p.current_version
    from practice_profile_versions v join practice_profiles p on p.firm_id=v.firm_id and p.id=v.profile_id
    where v.firm_id=${firmId} and v.id=${versionId} and v.deleted_at is null and p.deleted_at is null
    for share of p`;
  if (!row) throw profileUnavailable();
  if (row.archived_at)
    throw new ConflictException({
      code: 'PROFILE_ARCHIVED',
      message: 'This practice profile is archived. Choose an active profile.',
    });
  if (row.version !== row.current_version)
    throw new ConflictException({
      code: 'PROFILE_CHANGED',
      message: 'This practice profile changed. Review its current fields.',
    });
  return row;
}

/** Field values with sorted keys, so a retry that reorders them hashes to the same intent. */
export const sortedValues = <T extends Record<string, unknown>>(values: T): T =>
  Object.fromEntries(Object.entries(values).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) as T;

/**
 * Defence in depth for text the shared rules already refuse: Postgres errors for NUL, bad
 * Unicode or JSON become a 422 instead of a retryable 500. The database message is dropped.
 */
export function refuseUnstorable(error: { code?: string }): never {
  if (error.code === '22P05' || error.code === '22P02' || error.code === '22021')
    throw new UnprocessableEntityException({
      code: 'FIELD_VALUES_INVALID',
      message: 'Some text contains characters that cannot be stored.',
    });
  throw error;
}

/** Validates a patch against the pinned field set; the first problem names its field. */
export function fieldValuesOrThrow(
  row: ProfileVersionRow,
  current: PracticeFieldValues,
  patch: PracticeFieldPatch,
) {
  const result = applyFieldValues(practiceFieldListSchema.parse(row.fields), current, patch);
  if (!result.ok)
    throw new UnprocessableEntityException({
      code: 'FIELD_VALUES_INVALID',
      message: result.issues[0]!.message,
    });
  return result;
}
