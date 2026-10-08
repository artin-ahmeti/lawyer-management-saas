'use client';

import { Banner, Button, Card } from '@lawfirm/ui-web';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { signOutStaffSession } from '@/lib/staff-sign-out';
import { useOverlays } from '@/stores/ui';
import styles from './StaffInvitations.module.css';

export function StaffSessionActions() {
  const auth = getSupabaseBrowser();
  const cache = useQueryClient();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const signOut = async () => {
    if (!auth || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      const outcome = await signOutStaffSession(auth.auth, cache, () => {
        useOverlays.setState(useOverlays.getInitialState(), true);
      });
      // A full navigation discards cached route payloads and in-memory page drafts.
      window.location.replace(
        outcome.authSignOutAccepted ? '/sign-in' : '/sign-in?notice=sign-out-unconfirmed',
      );
    } catch {
      setError('Could not sign out. Try again.');
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <section aria-label="Your session">
      <Card
        className={styles.panel}
        title={<h2 className="cl-t-title-3">Your session</h2>}
        subtitle="Sign out of this browser. Other devices stay signed in."
        headerAction={
          <Button
            type="button"
            variant="secondary"
            className={styles.control}
            disabled={!auth || pending}
            onClick={() => void signOut()}
          >
            {pending ? 'Signing out…' : 'Sign out'}
          </Button>
        }
      >
        {error && <Banner tone="warning" role="alert" title={error} />}
        {pending && (
          <p role="status" className={styles.note}>
            Signing out of this browser…
          </p>
        )}
      </Card>
    </section>
  );
}
