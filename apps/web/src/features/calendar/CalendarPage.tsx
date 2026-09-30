'use client';

import { Button, List, ListRow, Pill, SegmentedControl, TimeBlock } from '@lawfirm/ui-web';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Page, QueryGate } from '@/components/PageState';
import { useEvents, type CalendarEvent } from '@/lib/data';
import { TIME_ZONE, now, toIsoDate, todayIso } from '@/lib/clock';
import { fmtClockTime, fmtDate, fmtDateYear, fmtTime, plural } from '@/lib/format';
import { useOverlays } from '@/stores/ui';
import { DAY_START_HOUR, EVENT_TONES, HOURS, HOUR_PX, WEEK_DAYS, hourLabel } from './data';

type View = 'week' | 'agenda';

const clockParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

/** Decimal hour in the firm's zone: 9:30 → 9.5. */
function decimalHour(date: Date): number {
  const parts = clockParts.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get('hour') + get('minute') / 60;
}

/** Calendar: the week grid (court, deadlines, meetings) or the same events as an agenda. */
export function CalendarPage() {
  const events = useEvents();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openForm = useOverlays((s) => s.openForm);
  const rawOffset = Number(params.get('week') ?? '0');
  const offset = Number.isSafeInteger(rawOffset) && Math.abs(rawOffset) <= 520 ? rawOffset : 0;
  const weekDays = WEEK_DAYS.map((d) => {
    const date = new Date(`${d.date}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset * 7);
    return { ...d, date: date.toISOString().slice(0, 10) };
  });
  const setWeek = (value: number) => {
    const next = new URLSearchParams(params.toString());
    if (value === 0) next.delete('week');
    else next.set('week', String(value));
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const view: View = params.get('view') === 'agenda' ? 'agenda' : 'week';
  const setView = (v: View) => {
    const next = new URLSearchParams(params.toString());
    if (v === 'week') next.delete('view');
    else next.set('view', v);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const all = events.data ?? [];
  const today = todayIso();
  const todayIdx = weekDays.findIndex((d) => d.date === today);
  const nowHour = decimalHour(now());
  const byDay: CalendarEvent[][] = weekDays.map((d) =>
    all
      .filter((e) => toIsoDate(new Date(e.startsAt)) === d.date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  );
  const first = weekDays[0]!;
  const last = weekDays[weekDays.length - 1]!;
  const weekEvents = byDay.flat();
  const courtCount = weekEvents.filter((e) => e.kind === 'Court').length;
  const deadlineCount = weekEvents.filter((e) => e.kind === 'Deadline').length;
  const dayNumber = (iso: string) => Number(iso.slice(8, 10));
  const open = (e: CalendarEvent) => router.push(`/matters/${e.matterId}`);

  return (
    <QueryGate queries={[events]} routeKey="calendar" empty={all.length === 0}>
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Calendar</h1>
            <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
              {fmtDate(first.date)} – {fmtDateYear(last.date)} · {plural(courtCount, 'court event')}{' '}
              · {plural(deadlineCount, 'deadline')}
            </div>
          </div>
          <div className="cl-pagehead__actions">
            <div className="cl-inline" style={{ gap: 4 }}>
              <Button
                variant="ghost"
                iconOnly
                icon="chevron-left"
                aria-label="Previous week"
                onClick={() => setWeek(offset - 1)}
              />
              <Button onClick={() => setWeek(0)}>Today</Button>
              <Button
                variant="ghost"
                iconOnly
                icon="chevron-right"
                aria-label="Next week"
                onClick={() => setWeek(offset + 1)}
              />
            </div>
            <SegmentedControl
              items={[
                { value: 'week', label: 'Week' },
                { value: 'agenda', label: 'Agenda' },
              ]}
              value={view}
              onChange={(v) => setView(v as View)}
            />
            <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'event' })}>
              New event
            </Button>
          </div>
        </div>

        {view === 'week' ? (
          <div className="cl-table-wrap app-fade" style={{ overflow: 'auto' }}>
            <div
              style={{
                display: 'grid',
                minWidth: 700,
                gridTemplateColumns: `56px repeat(${weekDays.length}, minmax(0, 1fr))`,
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              <div />
              {weekDays.map((d, i) => (
                <div
                  key={d.date}
                  style={{
                    padding: '10px 12px',
                    borderLeft: '1px solid var(--hairline)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <span className="cl-t-overline" style={{ color: 'var(--ink-2)' }}>
                    {d.name}
                  </span>
                  <span
                    className="cl-t-title-3"
                    style={{ color: i === todayIdx ? 'var(--accent)' : 'var(--ink)' }}
                  >
                    {dayNumber(d.date)}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                minWidth: 700,
                gridTemplateColumns: `56px repeat(${weekDays.length}, minmax(0, 1fr))`,
                position: 'relative',
                height: HOURS.length * HOUR_PX,
              }}
            >
              <div style={{ position: 'relative' }}>
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      top: i * HOUR_PX,
                      right: 8,
                      transform: 'translateY(-8px)',
                      font: 'var(--text-caption)',
                      color: 'var(--ink-3)',
                    }}
                  >
                    {hourLabel(h)}
                  </div>
                ))}
              </div>
              {weekDays.map((d, i) => (
                <div
                  key={d.date}
                  style={{
                    position: 'relative',
                    borderLeft: '1px solid var(--hairline)',
                    background: i === todayIdx ? 'var(--accent-tint)' : 'transparent',
                  }}
                >
                  {HOURS.map((h, j) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: j * HOUR_PX,
                        borderTop: '1px solid var(--hairline)',
                        opacity: 0.6,
                      }}
                    />
                  ))}
                  {byDay[i]!.map((e) => {
                    const tone = EVENT_TONES[e.tone];
                    const start = decimalHour(new Date(e.startsAt));
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => open(e)}
                        aria-label={`${e.title}, ${fmtClockTime(e.startsAt)}`}
                        style={{
                          position: 'absolute',
                          left: 4,
                          width: 'calc(100% - 8px)',
                          top: (start - DAY_START_HOUR) * HOUR_PX,
                          height: Math.max((e.durationMin / 60) * HOUR_PX - 4, 28),
                          borderRadius: 6,
                          padding: '6px 8px',
                          background: tone.bg,
                          color: tone.ink,
                          border: 0,
                          borderLeft: `3px solid ${tone.bar}`,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          font: 'var(--text-caption)',
                          fontWeight: 600,
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          justifyContent: 'flex-start',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div className="cl-truncate">{e.title}</div>
                        <div className="cl-truncate" style={{ fontWeight: 500, opacity: 0.8 }}>
                          {e.sub}
                        </div>
                      </button>
                    );
                  })}
                  {i === todayIdx ? (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: (nowHour - DAY_START_HOUR) * HOUR_PX,
                        borderTop: '2px solid var(--danger-dot)',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: -5,
                          top: -5,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--danger-dot)',
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="cl-stack cl-stack--xl app-fade" style={{ maxWidth: 840 }}>
            {weekDays.map((d, i) => {
              const dayEvents = byDay[i]!;
              return (
                <div key={d.date}>
                  <div className="cl-section">
                    <span className="cl-section__title">
                      {d.name}, {fmtDate(d.date)}
                      {i === todayIdx ? ' · Today' : ''}
                    </span>
                    <span className="cl-t-caption cl-muted">
                      {plural(dayEvents.length, 'event')}
                    </span>
                  </div>
                  {dayEvents.length ? (
                    <List>
                      {dayEvents.map((e) => {
                        const t = fmtTime(e.startsAt);
                        return (
                          <ListRow
                            key={e.id}
                            lead={<TimeBlock main={t.time} sub={t.ampm} />}
                            title={e.title}
                            subtitle={e.sub}
                            pill={
                              <Pill tone={e.tone} dot={e.dot}>
                                {e.kind}
                              </Pill>
                            }
                            onClick={() => open(e)}
                          />
                        );
                      })}
                    </List>
                  ) : (
                    <div className="cl-t-caption cl-muted" style={{ padding: '4px 0' }}>
                      Nothing scheduled.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Page>
    </QueryGate>
  );
}
