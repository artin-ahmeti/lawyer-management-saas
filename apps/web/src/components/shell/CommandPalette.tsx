'use client';

import { Icon, IconWell, type IconName } from '@lawfirm/ui-web';
import { useRouter } from 'next/navigation';
import { useId, useState, type KeyboardEvent } from 'react';
import { useContacts, useInvoices, useMatters, useWrites } from '@/lib/data';
import { money } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useOverlays } from '@/stores/ui';
import { Overlay } from './Overlay';

interface PaletteItem {
  group: string;
  label: string;
  icon: IconName;
  hint: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useOverlays((s) => s.paletteOpen);
  return open ? <PaletteDialog /> : null;
}

/** ⌘K: jump to a page, a matter, a contact or an invoice, or run a command. Five per group. */
function PaletteDialog() {
  const close = useOverlays((s) => s.closePalette);
  const openCapture = useOverlays((s) => s.openCapture);
  const confirm = useOverlays((s) => s.confirm);
  const notify = useOverlays((s) => s.notify);
  const router = useRouter();
  const { scheme, toggle } = useTheme();
  const writes = useWrites();
  const matters = useMatters();
  const contacts = useContacts();
  const invoices = useInvoices();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const id = useId();
  const go = (href: string) => {
    close();
    router.push(href);
  };
  const overdue = (invoices.data ?? []).find((i) => i.status === 'overdue' && i.balanceCents > 0);
  const statusHint = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);
  const all: PaletteItem[] = [
    { group: 'Jump to', label: 'Today', icon: 'home', hint: 'G T', run: () => go('/today') },
    {
      group: 'Jump to',
      label: 'Pre-bill review · September',
      icon: 'receipt',
      hint: 'G B',
      run: () => go('/billing/prebill'),
    },
    {
      group: 'Jump to',
      label: 'Calendar · this week',
      icon: 'calendar',
      hint: 'G C',
      run: () => go('/calendar'),
    },
    ...(matters.data ?? []).map<PaletteItem>((m) => ({
      group: 'Matters',
      label: `${m.title} · ${m.number}`,
      icon: 'briefcase',
      hint: m.clientName,
      run: () => go(`/matters/${m.id}`),
    })),
    ...(contacts.data ?? []).map<PaletteItem>((c) => ({
      group: 'Contacts',
      label: c.name,
      icon: c.kind === 'org' ? 'building' : 'user',
      hint: c.role,
      run: () => go(`/contacts?selected=${c.id}`),
    })),
    ...(invoices.data ?? [])
      .filter((i) => i.status !== 'draft')
      .map<PaletteItem>((i) => ({
        group: 'Invoices',
        label: `${i.number} · ${i.clientName} · ${money(i.totalCents)}`,
        icon: 'receipt',
        hint: statusHint(i.status),
        run: () => go(`/billing/invoices/${i.id}`),
      })),
    {
      group: 'Commands',
      label: 'Log time…',
      icon: 'clock',
      hint: '⌘ L',
      run: () => openCapture('Log time'),
    },
    {
      group: 'Commands',
      label: 'Start timer',
      icon: 'play',
      hint: '',
      run: () => openCapture('Start timer'),
    },
    ...(overdue
      ? [
          {
            group: 'Commands',
            label: `Text pay link to ${overdue.clientName}`,
            icon: 'send' as const,
            hint: money(overdue.balanceCents),
            run: () => {
              close();
              confirm({
                title: `Text pay link to ${overdue.clientName}?`,
                text: `Sends a secure link for ${overdue.number} · ${money(overdue.balanceCents)} to ${overdue.contact}. ACH is offered first; card adds a 2.9% fee they can see before paying.`,
                cta: 'Text pay link',
                onConfirm: () => {
                  const undo = writes.textPayLink(overdue.id);
                  notify(
                    `Pay link texted to ${overdue.clientName} · ${money(overdue.balanceCents)}`,
                    'Undo',
                    undo,
                  );
                },
              });
            },
          },
        ]
      : []),
    {
      group: 'Commands',
      label: scheme === 'dark' ? 'Switch to light theme' : 'Switch to courthouse mode',
      icon: scheme === 'dark' ? 'sun' : 'moon',
      hint: '',
      run: () => {
        close();
        toggle();
      },
    },
  ];
  const count = new Map<string, number>();
  const items = all
    .filter(
      (i) =>
        !query.trim() || `${i.label} ${i.hint}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .filter((i) => {
      const n = count.get(i.group) ?? 0;
      count.set(i.group, n + 1);
      return n < 5;
    });
  const selected = Math.min(active, Math.max(0, items.length - 1));
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next =
        e.key === 'ArrowDown'
          ? Math.min(items.length - 1, selected + 1)
          : Math.max(0, selected - 1);
      setActive(Math.max(0, next));
      document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      items[selected]?.run();
    }
  };
  return (
    <Overlay
      onClose={close}
      label="Search or jump to"
      style={{
        width: 'min(600px, calc(100vw - 32px))',
        margin: '12vh auto 0',
        padding: 0,
      }}
    >
      <div
        className="app-pop"
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--hairline)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          color: 'var(--ink)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--hairline)',
          }}
        >
          <Icon name="search" style={{ color: 'var(--ink-3)' }} />
          <input
            className="app-palette-input"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Search matters, contacts, invoices… or type a command"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={`${id}-results`}
            aria-activedescendant={items.length ? `${id}-${selected}` : undefined}
          />
          <span className="cl-kbd" style={{ margin: 0 }}>
            esc
          </span>
        </div>
        <div
          id={`${id}-results`}
          role="listbox"
          aria-label="Search results"
          style={{ maxHeight: 400, overflow: 'auto', padding: 6 }}
        >
          {!items.length ? (
            <div className="cl-t-body-sm cl-muted" style={{ padding: 14 }} role="status">
              No matches for “{query}”.
            </div>
          ) : null}
          {items.map((item, index) => (
            <div key={item.group + item.label}>
              {index === 0 || items[index - 1]?.group !== item.group ? (
                <div
                  className="cl-t-overline"
                  style={{ color: 'var(--ink-3)', padding: '10px 10px 4px' }}
                >
                  {item.group}
                </div>
              ) : null}
              <button
                id={`${id}-${index}`}
                type="button"
                role="option"
                aria-selected={index === selected}
                className={`app-palette-item ${index === selected ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={item.run}
              >
                <IconWell name={item.icon} className="app-plan-feature-icon" />
                <span className="cl-truncate" style={{ flex: 1, minWidth: 0 }}>
                  {item.label}
                </span>
                <span className="cl-t-caption cl-faint">{item.hint}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
