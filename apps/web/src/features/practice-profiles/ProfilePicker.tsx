'use client';
import type { createApiClient } from '@lawfirm/api-client';
import type { PracticeProfileRecord, PracticeProfileSummary } from '@lawfirm/core';
import { Button, Field } from '@lawfirm/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { loadProfile, loadProfileList } from './live-profiles';
import styles from './PracticeProfiles.module.css';

// A form in progress must not change under the user, so these reads do not refetch on focus.
const live = {
  retry: false as const,
  staleTime: 0,
  gcTime: 0,
  networkMode: 'always' as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
};
/** Active profiles in name order; a firm's profile list is small, so pages are joined. */
async function activeProfiles(
  client: ReturnType<typeof createApiClient>,
  firmId: string,
  signal: AbortSignal,
) {
  const items: PracticeProfileSummary[] = [];
  let cursor: { afterName: string; afterId: string } | null = null;
  for (let page = 0; page < 10; page++) {
    const list = await loadProfileList(client, firmId, { status: 'active', ...cursor }, signal);
    items.push(...list.items);
    cursor = list.nextCursor;
    if (!cursor) break;
  }
  return { items, truncated: cursor !== null };
}
/** Until the chosen profile's fields load, a form must not submit as if none were chosen. */
export type PickedProfile =
  | { state: 'none' }
  | { state: 'loading' | 'failed'; profile?: undefined }
  | { state: 'ready'; profile: PracticeProfileRecord };

/** Choose an active profile; the chosen profile's current version is loaded for its fields. */
export function ProfilePicker({
  client,
  context,
  firmId,
  idPrefix,
  disabled,
  onProfile,
}: {
  client: ReturnType<typeof createApiClient>;
  context: string;
  firmId: string;
  idPrefix: string;
  disabled?: boolean;
  onProfile: (picked: PickedProfile) => void;
}) {
  const [profileId, setProfileId] = useState('');
  const list = useQuery({
    ...live,
    queryKey: ['server-practice-profiles', context, 'active-all'],
    queryFn: ({ signal }) => activeProfiles(client, firmId, signal),
  });
  const detail = useQuery({
    ...live,
    queryKey: ['server-practice-profiles', context, 'record', profileId],
    enabled: !!profileId,
    queryFn: ({ signal }) => loadProfile(client, firmId, profileId, signal),
  });
  const chosen = profileId ? detail.data?.profile : undefined;
  const pending = !profileId || chosen ? undefined : detail.isError ? 'failed' : 'loading';
  // Report only when the chosen profile changes, whatever callback identity the parent passes.
  const report = useRef(onProfile);
  useEffect(() => {
    report.current = onProfile;
  });
  useEffect(
    () =>
      report.current(
        chosen
          ? { state: 'ready', profile: chosen }
          : pending
            ? { state: pending }
            : { state: 'none' },
      ),
    [chosen, pending],
  );
  const id = `${idPrefix}-profile`;
  return (
    <Field
      label={<span id={`${id}-label`}>Practice profile</span>}
      optional
      help={
        <span id={`${id}-help`} role={list.isError || detail.isError ? 'alert' : undefined}>
          {list.isError
            ? 'Profiles could not be loaded.'
            : detail.isError
              ? 'This profile could not be loaded. Choose it again or refresh.'
              : profileId && detail.isFetching
                ? 'Loading profile fields…'
                : list.data && !list.data.items.length
                  ? 'No active profiles yet. Owners and admins add them in Settings.'
                  : list.data?.truncated
                    ? 'Showing the first 200 active profiles in name order.'
                    : 'Adds the profile’s fields to this matter. Its current version stays with the matter.'}
        </span>
      }
    >
      <div className={styles.actions}>
        <select
          id={id}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-help`}
          className={`cl-input ${styles.select}`}
          value={profileId}
          disabled={disabled || list.isPending || list.isError}
          onChange={(e) => setProfileId(e.target.value)}
        >
          <option value="">{list.isPending ? 'Loading profiles…' : 'No profile'}</option>
          {(list.data?.items ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {(list.isError || detail.isError) && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void (list.isError ? list.refetch() : detail.refetch())}
          >
            Retry profiles
          </Button>
        )}
      </div>
    </Field>
  );
}
