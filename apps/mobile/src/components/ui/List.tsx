import { Children, Fragment, isValidElement, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import { Text, type TextTone } from './Text';

export interface ListProps extends PropsWithChildren {
  /** No surface, border or radius (inside a card). */
  flat?: boolean;
  /** Inset separators past a leading avatar/check (64px instead of 16). */
  inset?: boolean;
  footer?: ReactNode;
  className?: string;
}

/** Grouped list container: surface, hairline, 12px radius. Rows go inside; never float rows as cards. */
export function List({ flat, inset, footer, className, children }: ListProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View
      className={cn(
        !flat && 'overflow-hidden rounded-lg border border-hairline bg-surface',
        className,
      )}
    >
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? (
            <View className={cn('h-px bg-hairline', flat ? '' : inset ? 'ml-16' : 'ml-4')} />
          ) : null}
          {row}
        </Fragment>
      ))}
      {footer ? (
        <View className="flex-row items-center justify-between border-t border-hairline px-4 py-2.5">
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  /** Second line in ink-secondary. Pass a string with " · " separators or a node. */
  subtitle?: ReactNode;
  /** Leading element: Checkbox, Avatar, IconWell, or a TimeBlock. */
  lead?: ReactNode;
  /** Trailing value in tabular figures ("$8,125.00", "1.6h"). */
  value?: string;
  meta?: string;
  metaTone?: 'neutral' | 'warning' | 'danger';
  /** Trailing pill (under the value, or alone). */
  pill?: ReactNode;
  /** Free-form trailing content (buttons). Replaces value/meta/pill. */
  trail?: ReactNode;
  chevron?: boolean;
  selected?: boolean;
  /** Title at regular weight (tasks, time entries). */
  regular?: boolean;
  /** Struck-through title (completed task). */
  done?: boolean;
  flat?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
}

/**
 * The workhorse row: optional leading element, a two-line body, a trailing
 * value/status column. 60px tall; separators come from the parent List.
 */
export function ListRow({
  title,
  subtitle,
  lead,
  value,
  meta,
  metaTone = 'neutral',
  pill,
  trail,
  chevron,
  selected,
  regular,
  done,
  flat,
  onPress,
  onLongPress,
  className,
}: ListRowProps) {
  const metaT: TextTone =
    metaTone === 'danger' ? 'danger' : metaTone === 'warning' ? 'warning' : 'muted';
  const hasTrail =
    trail !== undefined || value !== undefined || meta !== undefined || pill !== undefined;
  const content = (
    <>
      {lead ? <View className="items-center justify-center">{lead}</View> : null}
      <View className="flex-1 gap-0.5">
        <Text
          variant={regular ? 'body' : 'body-strong'}
          tone={done ? 'faint' : 'default'}
          numberOfLines={1}
          className={done ? 'line-through' : undefined}
        >
          {title}
        </Text>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <Text variant="label" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : (
            <View className="flex-row items-center gap-1.5">{subtitle}</View>
          )
        ) : null}
      </View>
      {hasTrail ? (
        trail !== undefined ? (
          <View className="flex-row items-center gap-1.5">{trail}</View>
        ) : (
          <View className="items-end gap-1">
            {value !== undefined ? (
              <Text variant="amount" tabular>
                {value}
              </Text>
            ) : null}
            {pill}
            {meta !== undefined ? (
              <Text
                variant="caption"
                tone={metaT}
                weight={metaTone === 'neutral' ? 'medium' : 'semibold'}
              >
                {meta}
              </Text>
            ) : null}
          </View>
        )
      ) : null}
      {chevron ? <Icon name="chevron-right" size="sm" tone="ink-3" /> : null}
    </>
  );
  const cls = cn(
    'min-h-[60px] flex-row items-center gap-3 py-2.5',
    flat ? 'px-0' : 'px-4',
    selected && 'bg-accent-tint',
    className,
  );
  if (onPress || onLongPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={onLongPress}
        className={cn(cls, 'active:bg-surface-2')}
      >
        {content}
      </Pressable>
    );
  }
  return <View className={cls}>{content}</View>;
}

/** Subtitle fragment: text in ink-secondary (use with RowSep between parts). */
export function RowText({ children, mono }: { children: string; mono?: boolean }) {
  return (
    <Text variant={mono ? 'mono-id' : 'label'} tone="muted" numberOfLines={1} tabular={mono}>
      {children}
    </Text>
  );
}

/** Dot separator between subtitle parts. */
export function RowSep() {
  return (
    <Text variant="label" tone="faint">
      ·
    </Text>
  );
}

/** Leading time column for agenda rows and time entries. */
export function TimeBlock({ main, sub }: { main: string; sub?: string }) {
  return (
    <View className="w-[52px]">
      <Text variant="label" weight="semibold" tabular>
        {main}
      </Text>
      {sub ? (
        <Text variant="caption" tone="muted" tabular>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
