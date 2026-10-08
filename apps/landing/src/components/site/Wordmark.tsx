import { cn } from '@/lib/cn';

/**
 * The approved wordmark (Geist 600, −0.03em). The design system has no final
 * symbol yet and its placeholder tile must not appear on marketing, so the
 * wordmark stands alone and the vessel motif stays separate from the identity.
 */
export function Wordmark({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <a
      href="#top"
      onClick={onNavigate}
      className={cn(
        'inline-flex min-h-11 items-center text-[22px] font-semibold tracking-[-0.03em] text-ink',
        className,
      )}
    >
      Clepso<span className="sr-only">, home</span>
    </a>
  );
}
