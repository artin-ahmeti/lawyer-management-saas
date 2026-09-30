'use client';

import {
  Button,
  Checkbox,
  Chip,
  EmptyState,
  List,
  ListRow,
  RowSep,
  Toolbar,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Page, QueryGate } from '@/components/PageState';
import { useMatters, useTasks, useWrites, type Task, type TaskGroup } from '@/lib/data';
import { CURRENT_USER } from '@/lib/data/fixtures';
import { todayIso } from '@/lib/clock';
import { daysFromToday, fmtDate } from '@/lib/format';
import { useOverlays } from '@/stores/ui';

type Filter = 'Mine' | 'Firm' | 'Overdue' | 'Done';
const FILTERS: Filter[] = ['Mine', 'Firm', 'Overdue', 'Done'];
const GROUPS: TaskGroup[] = ['Today', 'This week', 'Later'];
const EMPTY_COPY: Record<Filter, { title: string; text: string }> = {
  Mine: { title: 'All caught up', text: 'No open tasks assigned to you.' },
  Firm: { title: 'All caught up', text: 'No open tasks across the firm.' },
  Overdue: { title: 'Nothing overdue', text: 'Every open task is still inside its due date.' },
  Done: { title: 'Nothing done yet', text: 'Tasks you check off land here.' },
};

/** "Today" for today's tasks, otherwise the calendar date ("Oct 3"). */
const dueText = (iso: string): string => (daysFromToday(iso) === 0 ? 'Today' : fmtDate(iso));

/** Tasks: yours, the firm's, the overdue and the done, grouped by when they are due. */
export function TasksPage() {
  const tasks = useTasks();
  const matters = useMatters();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { toggleTask } = useWrites();
  const notify = useOverlays((s) => s.notify);
  const openCapture = useOverlays((s) => s.openCapture);

  const filterParam = params.get('filter');
  const filter: Filter = FILTERS.includes(filterParam as Filter) ? (filterParam as Filter) : 'Mine';
  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(params.toString());
    if (f === 'Mine') next.delete('filter');
    else next.set('filter', f);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const all = tasks.data ?? [];
  const today = todayIso();
  const matterById = new Map((matters.data ?? []).map((m) => [m.id, m]));
  const isMine = (t: Task) => t.assignee === CURRENT_USER.short;
  const isOverdue = (t: Task) => t.dueAt < today;
  const matches: Record<Filter, (t: Task) => boolean> = {
    Mine: isMine,
    Firm: () => true,
    Overdue: isOverdue,
    Done: (t) => t.done,
  };
  const openAll = all.filter((t) => !t.done);
  const counts: Record<Filter, number | undefined> = {
    Mine: openAll.filter(isMine).length,
    Firm: openAll.length,
    Overdue: openAll.filter(isOverdue).length,
    Done: undefined,
  };
  const visible = all.filter((task) => matches[filter](task) && (filter === 'Done' || !task.done));
  const groups = GROUPS.map((label) => {
    const items = visible.filter((t) => t.group === label);
    return { label, items, count: items.filter((t) => !t.done).length };
  }).filter((g) => g.items.length > 0);

  const toggle = (t: Task) => {
    const undo = toggleTask(t.id);
    notify(t.done ? `Reopened · ${t.title}` : `Done · ${t.title}`, 'Undo', undo);
  };

  return (
    <QueryGate queries={[tasks, matters]} routeKey="tasks" empty={all.length === 0}>
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Tasks</h1>
            <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
              {openAll.length} open · {counts.Overdue} overdue
            </div>
          </div>
          <div className="cl-pagehead__actions">
            <Button variant="primary" icon="plus" onClick={() => openCapture('Task')}>
              New task
            </Button>
          </div>
        </div>

        <Toolbar>
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} count={counts[f]} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </Toolbar>

        {groups.length ? (
          <div className="cl-stack cl-stack--xl" style={{ maxWidth: 880 }}>
            {groups.map((g) => (
              <div key={g.label}>
                <div className="cl-section">
                  <span className="cl-section__title">
                    {g.label}
                    <span className="cl-section__count">{g.count}</span>
                  </span>
                </div>
                <List>
                  {g.items.map((t) => {
                    const matter = matterById.get(t.matterId);
                    return (
                      <ListRow
                        key={t.id}
                        lead={
                          <Checkbox
                            checked={t.done}
                            label={t.done ? `Reopen ${t.title}` : `Mark ${t.title} done`}
                            onChange={() => toggle(t)}
                          />
                        }
                        title={t.title}
                        done={t.done}
                        subtitle={
                          <>
                            <Link href={`/matters/${t.matterId}`} style={{ color: 'inherit' }}>
                              {matter?.title ?? 'Matter'}
                            </Link>
                            <RowSep />
                            {t.assignee}
                          </>
                        }
                        meta={dueText(t.dueAt)}
                        metaTone={t.done ? 'neutral' : t.tone}
                      />
                    );
                  })}
                </List>
              </div>
            ))}
          </div>
        ) : (
          <div className="cl-table-wrap" style={{ maxWidth: 880 }}>
            <EmptyState
              icon="check"
              title={EMPTY_COPY[filter].title}
              text={EMPTY_COPY[filter].text}
              action={
                <Button variant="primary" icon="plus" onClick={() => openCapture('Task')}>
                  New task
                </Button>
              }
            />
          </div>
        )}
      </Page>
    </QueryGate>
  );
}
