'use client';

import { useId, type ReactNode } from 'react';

export interface PageTab {
  key: string;
  label: ReactNode;
  count?: number | string;
}

/** Underline tab strip for detail pages (matter tabs); segmented controls are for views of one list. */
export function PageTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: PageTab[];
  value: string;
  onChange: (key: string) => void;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label="Matter sections"
      style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--hairline)' }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          id={`${id}-${t.key}`}
          tabIndex={t.key === value ? 0 : -1}
          aria-selected={t.key === value}
          className={['app-tab', t.key === value && 'is-active'].filter(Boolean).join(' ')}
          onClick={() => onChange(t.key)}
          onKeyDown={(e) => {
            const index = tabs.findIndex((tab) => tab.key === t.key);
            const next =
              e.key === 'ArrowRight'
                ? (index + 1) % tabs.length
                : e.key === 'ArrowLeft'
                  ? (index + tabs.length - 1) % tabs.length
                  : e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? tabs.length - 1
                      : -1;
            if (next >= 0) {
              e.preventDefault();
              const tab = tabs[next]!;
              onChange(tab.key);
              document.getElementById(`${id}-${tab.key}`)?.focus();
            }
          }}
        >
          {t.label}
          {t.count !== undefined && t.count !== '' ? (
            <span className="cl-section__count">{t.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
