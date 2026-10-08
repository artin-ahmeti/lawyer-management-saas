'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  description?: ReactNode;
}

/**
 * WAI-ARIA tabs with automatic activation and roving focus (arrow keys,
 * Home/End). Panels are rendered by the caller with `tabPanelProps`.
 */
export function Tabs<T extends string>({
  items,
  selected,
  onSelect,
  label,
  idBase,
  orientation = 'horizontal',
  className,
  tabClassName,
}: {
  items: readonly TabItem<T>[];
  selected: T;
  onSelect: (id: T) => void;
  label: string;
  idBase: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  tabClassName?: (active: boolean) => string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Both axes: the same tablist is horizontal on phones and vertical on desktop.
    const next = ['ArrowRight', 'ArrowDown'];
    const prev = ['ArrowLeft', 'ArrowUp'];
    let target = -1;
    if (next.includes(e.key)) target = (index + 1) % items.length;
    else if (prev.includes(e.key)) target = (index - 1 + items.length) % items.length;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = items.length - 1;
    if (target < 0) return;
    e.preventDefault();
    const item = items[target];
    if (!item) return;
    onSelect(item.id);
    refs.current[target]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} aria-orientation={orientation} className={className}>
      {items.map((item, i) => {
        const active = item.id === selected;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${item.id}`}
            aria-selected={active}
            aria-controls={`${idBase}-panel-${item.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn('text-left', tabClassName?.(active))}
          >
            {item.label}
            {item.description}
          </button>
        );
      })}
    </div>
  );
}

export const tabPanelProps = (idBase: string, id: string) => ({
  role: 'tabpanel' as const,
  id: `${idBase}-panel-${id}`,
  'aria-labelledby': `${idBase}-tab-${id}`,
  tabIndex: 0,
});
