'use client';

import {
  Avatar,
  Banner,
  Button,
  Card,
  Field,
  FormRow,
  Icon,
  IconWell,
  Pill,
  SegmentedControl,
  Switch,
  Table,
  type IconName,
} from '@lawfirm/ui-web';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { NativeSelect } from '@/components/NativeSelect';
import { Page, QueryGate } from '@/components/PageState';
import {
  useIntegrations,
  useMatters,
  usePlaybooks,
  useSettings,
  useTimekeepers,
  useWrites,
  type Plan,
  type WorkspaceSettings,
} from '@/lib/data';
import { PLAN_INVOICES, PLANS, PLAN_USAGE } from '@/lib/data/fixtures';
import { reads } from '@/lib/data/source';
import { csv, downloadFile } from '@/lib/download';
import { money } from '@/lib/format';
import { useOverlays } from '@/stores/ui';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { FirmProfileForm } from './FirmProfileForm';

const SECTIONS = ['Firm', 'Plan', 'Users', 'Playbooks', 'Billing', 'Integrations', 'Security'];
const SECTION_META: Record<string, { label: string; icon: IconName }> = {
  Firm: { label: 'Firm profile', icon: 'building' },
  Plan: { label: 'Plan & billing', icon: 'tag' },
  Users: { label: 'Users & roles', icon: 'users' },
  Playbooks: { label: 'Playbooks', icon: 'briefcase' },
  Billing: { label: 'Billing & rates', icon: 'receipt' },
  Integrations: { label: 'Integrations', icon: 'link' },
  Security: { label: 'Security', icon: 'shield' },
};
const CARD = 'Visa ····4410';
const dollars = (cents: number) => money(cents).replace('.00', '');

export function SettingsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const section =
    SECTIONS.find((s) => s.toLowerCase() === params.get('section')?.toLowerCase()) ?? 'Firm';
  const settings = useSettings();
  const people = useTimekeepers();
  const playbooks = usePlaybooks();
  const integrations = useIntegrations();
  const matters = useMatters();
  const writes = useWrites();
  const openForm = useOverlays((s) => s.openForm);
  const confirm = useOverlays((s) => s.confirm);
  const notify = useOverlays((s) => s.notify);
  const [cycle, setCycle] = useState('annual');
  const [signingOut, setSigningOut] = useState(false);
  const auth = getSupabaseBrowser();
  const signOut = async () => {
    if (!auth) return;
    setSigningOut(true);
    try {
      const { error } = await auth.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace('/sign-in');
      router.refresh();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Could not sign out. Try again.');
    } finally {
      setSigningOut(false);
    }
  };
  const select = (s: string) =>
    router.replace(`/settings?section=${s.toLowerCase()}`, { scroll: false });
  const s = settings.data;
  const annual = cycle === 'annual';
  const seats = s?.firm.plan.seats ?? 3;
  const renewsOn = s?.firm.plan.renewsOn ?? '';
  const currentPlan = PLANS.find((plan) => plan.key === s?.planKey);
  const priceOf = (plan: Plan) => (annual ? plan.annualCents : plan.monthlyCents);
  const toggle = (key: keyof WorkspaceSettings, label: string, text: string) =>
    s && (
      <div className="cl-option">
        <div>
          <div className="cl-t-body-sm">{label}</div>
          <div className="cl-t-caption cl-muted">{text}</div>
        </div>
        <Switch
          label={label}
          checked={Boolean(s[key])}
          onChange={(checked) => {
            const undo = writes.patchSettings({ [key]: checked });
            notify(`${label} ${checked ? 'enabled' : 'disabled'}`, 'Undo', undo);
          }}
        />
      </div>
    );
  const premier = PLANS.find((p) => p.key === 'premier')!;
  const askUpgrade = () =>
    confirm({
      title: 'Upgrade to Clepso Premier?',
      text: `Premier starts today for ${seats} users at ${dollars(priceOf(premier))}/user/month, prorated for the remaining term. Adds budgets, profitability, custom reports, API access and priority support.`,
      cta: 'Upgrade now',
      onConfirm: () => {
        const undo = writes.changePlan('premier', annual ? 'annual' : 'monthly');
        notify('Welcome to Clepso Premier · receipt emailed', 'Undo', undo);
      },
    });
  const choosePlan = (plan: Plan) => {
    if (plan.key === 'premier') return askUpgrade();
    const downgrade = PLANS.indexOf(plan) < (currentPlan ? PLANS.indexOf(currentPlan) : 0);
    confirm({
      title: `${downgrade ? 'Downgrade' : 'Upgrade'} to ${plan.name}?`,
      text: downgrade
        ? `Automation features (voice capture, Review your day, AI narratives, playbooks, auto-nudges) switch off at the end of the current term on ${renewsOn}. Your data is kept.`
        : `${plan.name.replace('Clepso ', '')} starts today for ${seats} users at ${dollars(priceOf(plan))}/user/month, prorated for the remaining term.`,
      cta: downgrade ? 'Schedule downgrade' : 'Upgrade now',
      tone: downgrade ? 'destructive-solid' : 'primary',
      onConfirm: () => {
        const undo = writes.changePlan(plan.key, annual ? 'annual' : 'monthly');
        notify(
          downgrade
            ? `Downgrade scheduled for ${renewsOn}`
            : `Welcome to ${plan.name} · receipt emailed`,
          'Undo',
          undo,
        );
      },
    });
  };
  const askCancel = () =>
    confirm({
      title: `Cancel the ${s?.firm.plan.name ?? 'Clepso'} plan?`,
      text: `Access continues until ${renewsOn}. Your data stays exportable for 90 days after that. No calls, no retention offers.`,
      cta: 'Cancel plan',
      tone: 'destructive-solid',
      onConfirm: () => {
        const undo = writes.patchSettings({ canceled: true });
        notify(`Plan cancelled · access until ${renewsOn}`, 'Undo', undo);
      },
    });
  const exportData = async () => {
    try {
      const [invoices, time, contacts, tasks, expenses] = await Promise.all([
        reads.invoices(),
        reads.timeEntries(),
        reads.contacts(),
        reads.tasks(),
        reads.expenses(),
      ]);
      const ledgers = await Promise.all(
        (matters.data ?? []).map(async (m) => ({
          matterId: m.id,
          entries: await reads.trustLedger(m.id),
        })),
      );
      downloadFile(
        'clepso-firm-data.json',
        JSON.stringify(
          { matters: matters.data, invoices, time, contacts, tasks, expenses, ledgers },
          null,
          2,
        ),
        'application/json',
      );
      notify('Export ready · clepso-firm-data.json downloaded');
    } catch {
      notify('Export failed. Please try again.');
    }
  };
  const taxDocuments = () =>
    downloadFile(
      'clepso-billing-history.csv',
      csv([
        ['Date', 'Invoice', 'Description', 'Period', 'Method', 'Amount USD', 'Status'],
        ...PLAN_INVOICES.map((i) => [
          i.date,
          i.number,
          i.description,
          i.sub,
          i.method,
          (i.amountCents / 100).toFixed(2),
          i.status,
        ]),
      ]),
    );
  return (
    <QueryGate routeKey="settings" queries={[settings, people, playbooks, integrations, matters]}>
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Settings</h1>
          </div>
        </div>
        <div className="app-settings-grid">
          <nav
            aria-label="Settings sections"
            className="cl-stack cl-stack--xs"
            style={{ alignSelf: 'start' }}
          >
            {SECTIONS.map((item) => (
              <Link
                key={item}
                href={`/settings?section=${item.toLowerCase()}`}
                replace
                scroll={false}
                className={`cl-navitem ${section === item ? 'is-active' : ''}`}
                aria-current={section === item ? 'page' : undefined}
              >
                <Icon name={SECTION_META[item]!.icon} />
                {SECTION_META[item]!.label}
              </Link>
            ))}
          </nav>
          {s ? (
            <div
              key={section}
              className="cl-stack cl-stack--xl app-fade"
              style={{ maxWidth: 760, minWidth: 0 }}
            >
              {section === 'Firm' ? (
                <>
                  <FirmProfileForm
                    key={JSON.stringify([s.firm.name, s.firm.address, s.firm.stateBar])}
                    settings={s}
                  />
                  <Card>
                    <div className="cl-spread">
                      <div>
                        <h2 className="cl-t-title-3">
                          {s.firm.plan.name} · {s.firm.plan.seats} users
                        </h2>
                        <div className="cl-t-caption cl-muted" style={{ marginTop: 2 }}>
                          {s.firm.plan.cycle === 'annual' ? 'Annual' : 'Monthly'} ·{' '}
                          {dollars(s.firm.plan.perSeatCents)}/user/month · renews {renewsOn}
                        </div>
                      </div>
                      <Button onClick={() => select('Plan')}>Manage plan</Button>
                    </div>
                  </Card>
                </>
              ) : null}
              {section === 'Plan' ? (
                <>
                  <Card flush className="app-plan-overview">
                    <div className="app-plan-summary">
                      <div className="app-plan-summary__details">
                        <div className="cl-inline" style={{ gap: 8 }}>
                          <Pill tone="accent">Current plan</Pill>
                          <Pill tone="outline">
                            {s.firm.plan.cycle === 'annual' ? 'Annual' : 'Monthly'}
                          </Pill>
                          {s.canceled ? (
                            <Pill tone="warning" dot>
                              Cancelled · ends {renewsOn}
                            </Pill>
                          ) : null}
                        </div>
                        <div>
                          <h2 className="cl-t-display app-plan-title">{s.firm.plan.name}</h2>
                          <p className="cl-t-body-sm cl-muted" style={{ margin: '4px 0 0' }}>
                            {currentPlan
                              ? `${currentPlan.tagline.split('. ').slice(0, 2).join('. ').replace(/\.$/, '')}.`
                              : ''}
                          </p>
                        </div>
                        <div className="app-plan-metrics">
                          <div>
                            <div className="cl-t-caption cl-muted">Active users</div>
                            <div className="cl-t-amount">{s.firm.plan.seats}</div>
                            <div className="cl-t-caption cl-faint">clients are free</div>
                          </div>
                          <div>
                            <div className="cl-t-caption cl-muted">Per user</div>
                            <div className="cl-t-amount">
                              {dollars(s.firm.plan.perSeatCents)}
                              <span className="cents">/mo</span>
                            </div>
                            <div className="cl-t-caption cl-faint">
                              billed {s.firm.plan.cycle === 'annual' ? 'annually' : 'monthly'}
                            </div>
                          </div>
                          <div>
                            <div className="cl-t-caption cl-muted">Next bill</div>
                            <div className="cl-t-amount">
                              {dollars(
                                s.firm.plan.perSeatCents *
                                  s.firm.plan.seats *
                                  (s.firm.plan.cycle === 'annual' ? 12 : 1),
                              )}
                              <span className="cents">.00</span>
                            </div>
                            <div className="cl-t-caption cl-faint">
                              {renewsOn} · {CARD}
                            </div>
                          </div>
                        </div>
                        <div className="cl-inline" style={{ gap: 8, marginTop: 4 }}>
                          <Button
                            variant="primary"
                            icon="arrow-up-right"
                            disabled={s.planKey === 'premier'}
                            onClick={askUpgrade}
                          >
                            Upgrade to Premier
                          </Button>
                          <Button onClick={() => openForm({ kind: 'invite' })}>Add a user</Button>
                          <Button
                            variant="ghost"
                            onClick={() => notify('Card update · opens secure Stripe form')}
                          >
                            Update card
                          </Button>
                        </div>
                      </div>
                      <div className="app-plan-summary__usage">
                        <h3 className="cl-t-body-strong" style={{ margin: 0 }}>
                          Usage this cycle
                        </h3>
                        {PLAN_USAGE.map((u) => (
                          <div key={u.label}>
                            <div className="cl-spread" style={{ marginBottom: 6, minWidth: 0 }}>
                              <span className="cl-t-label cl-truncate" style={{ minWidth: 0 }}>
                                {u.label}
                              </span>
                              <span
                                className="cl-t-caption cl-num cl-muted"
                                style={{ whiteSpace: 'nowrap', flex: 'none' }}
                              >
                                {u.text}
                              </span>
                            </div>
                            <div
                              className="cl-progress"
                              style={{ margin: 0 }}
                              role="progressbar"
                              aria-label={u.label}
                              aria-valuenow={u.pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className="cl-progress__bar"
                                style={{
                                  width: `${u.pct}%`,
                                  transition: 'width 700ms var(--ease-standard)',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        <p className="cl-t-caption cl-muted" style={{ margin: 'auto 0 0' }}>
                          Payment processing, SMS and storage overages are billed separately at cost
                          and appear on the monthly usage invoice.
                        </p>
                      </div>
                    </div>
                  </Card>
                  <div>
                    <div className="cl-section">
                      <span className="cl-section__title">Plans</span>
                      <SegmentedControl
                        value={cycle}
                        onChange={setCycle}
                        items={[
                          { value: 'annual', label: 'Annual' },
                          { value: 'monthly', label: 'Monthly' },
                        ]}
                      />
                    </div>
                    <div className="app-plan-cards">
                      {PLANS.map((p) => {
                        const current = p.key === s.planKey;
                        const price = priceOf(p);
                        const downgrade =
                          PLANS.indexOf(p) < (currentPlan ? PLANS.indexOf(currentPlan) : 0);
                        return (
                          <Card
                            key={p.key}
                            className="app-plan-card"
                            style={{
                              borderColor: current
                                ? 'transparent'
                                : p.badge
                                  ? 'var(--accent)'
                                  : undefined,
                              background: current ? 'var(--accent-tint)' : undefined,
                            }}
                          >
                            <div className="cl-spread">
                              <h3 className="cl-t-title-3" style={{ whiteSpace: 'nowrap' }}>
                                {p.name.replace('Clepso ', '')}
                              </h3>
                              {current ? (
                                <Pill tone="success">Current</Pill>
                              ) : p.badge ? (
                                <Pill tone="accent">{p.badge}</Pill>
                              ) : null}
                            </div>
                            <div>
                              <div style={{ whiteSpace: 'nowrap' }}>
                                <span className="cl-t-amount-lg">{dollars(price)}</span>
                                <span className="cl-t-caption cl-muted"> /user/mo</span>
                              </div>
                              <div className="cl-t-caption cl-faint" style={{ marginTop: 2 }}>
                                {dollars(price * seats * (annual ? 12 : 1))} /{' '}
                                {annual ? 'year' : 'month'} for {seats} users
                              </div>
                            </div>
                            <div className="cl-t-label app-plan-card__includes">{p.addsLabel}</div>
                            <div className="cl-stack" style={{ gap: 10 }}>
                              {p.caps.map((c) => (
                                <div
                                  key={c.label}
                                  className="cl-inline cl-inline--nowrap"
                                  style={{ gap: 10 }}
                                >
                                  <IconWell
                                    name={c.icon as IconName}
                                    tone={p.key === 'pro' ? 'accent' : 'neutral'}
                                    className="app-plan-feature-icon"
                                  />
                                  <span
                                    className="cl-t-caption"
                                    style={{ color: 'var(--ink)', lineHeight: '16px' }}
                                  >
                                    {c.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <Button
                              block
                              variant={
                                current ? 'secondary' : p.key === 'premier' ? 'primary' : 'outline'
                              }
                              disabled={current}
                              style={{ marginTop: 'auto' }}
                              onClick={() => choosePlan(p)}
                            >
                              {current ? 'Current plan' : downgrade ? 'Downgrade' : 'Upgrade'}
                            </Button>
                          </Card>
                        );
                      })}
                    </div>
                    <p
                      className="cl-t-caption cl-muted"
                      style={{ margin: '12px 0 0', textWrap: 'pretty' }}
                    >
                      Annual prices are monthly equivalents, paid upfront. One plan per firm; you
                      pay for active internal users only and client accounts are free. 14-day trial,
                      no credit card.
                    </p>
                  </div>
                  <div>
                    <div className="cl-section">
                      <span className="cl-section__title">Billing history</span>
                      <button type="button" className="cl-section__action" onClick={taxDocuments}>
                        Tax documents
                      </button>
                    </div>
                    <Table
                      compact
                      style={{ tableLayout: 'fixed' }}
                      columns={[
                        { key: 'date', header: 'Date', width: 72 },
                        { key: 'description', header: 'Description' },
                        { key: 'amount', header: 'Amount', align: 'right', width: 96 },
                        { key: 'status', header: 'Status', width: 84 },
                      ]}
                      rows={PLAN_INVOICES.map((i) => ({
                        id: i.number,
                        onClick: () => notify('Receipt PDF downloading'),
                        cells: [
                          <span key="date" style={{ whiteSpace: 'nowrap' }}>
                            {i.date}
                          </span>,
                          <div key="desc" style={{ overflow: 'hidden' }}>
                            <span className="cell-title cl-truncate" style={{ display: 'block' }}>
                              {i.description}
                            </span>
                            <span className="cell-sub cl-truncate" style={{ display: 'block' }}>
                              <span className="cell-mono">{i.number}</span> · {i.method} · {i.sub}
                            </span>
                          </div>,
                          <span key="amount" className="strong">
                            {money(i.amountCents)}
                          </span>,
                          <Pill key="paid" tone="success" dot>
                            {i.status}
                          </Pill>,
                        ],
                      }))}
                    />
                  </div>
                  <Card>
                    <div className="cl-spread">
                      <div>
                        <h3 className="cl-t-body-strong" style={{ margin: 0 }}>
                          {s.canceled ? 'Plan cancelled' : 'Cancel plan'}
                        </h3>
                        <p className="cl-t-caption cl-muted" style={{ margin: '2px 0 0' }}>
                          {s.canceled
                            ? `Access continues until ${renewsOn}. Data stays exportable for 90 days after that.`
                            : 'Access continues to the end of the paid term. Data stays exportable for 90 days.'}
                        </p>
                      </div>
                      {s.canceled ? (
                        <Button
                          onClick={() => {
                            const undo = writes.patchSettings({ canceled: false });
                            notify(`Plan resumed · renews ${renewsOn}`, 'Undo', undo);
                          }}
                        >
                          Resume plan
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={askCancel}>
                          Cancel plan
                        </Button>
                      )}
                    </div>
                  </Card>
                </>
              ) : null}
              {section === 'Users' ? (
                <>
                  <div>
                    <div className="cl-section">
                      <span className="cl-section__title">
                        Users &amp; roles
                        <span className="cl-section__count">{people.data?.length}</span>
                      </span>
                      <Button
                        variant="primary"
                        icon="plus"
                        onClick={() => openForm({ kind: 'invite' })}
                      >
                        Invite
                      </Button>
                    </div>
                    <Table
                      compact
                      columns={[
                        { key: 'name', header: 'Name' },
                        { key: 'role', header: 'Role' },
                        { key: 'rate', header: 'Rate', align: 'right' },
                        { key: '2fa', header: '2FA' },
                        { key: 'active', header: 'Last active' },
                        { key: 'more', header: '', width: 48 },
                      ]}
                      rows={(people.data ?? []).map((p) => ({
                        id: p.id,
                        cells: [
                          <span key="name" className="cl-inline cl-inline--nowrap">
                            <Avatar
                              size="sm"
                              initials={p.initials}
                              tone={p.isCurrentUser ? 'accent' : 'default'}
                            />
                            <span>
                              <span className="cell-title">{p.name}</span>
                              <span className="cell-sub">{p.email}</span>
                            </span>
                          </span>,
                          <Pill key="role" tone="outline">
                            {p.role}
                          </Pill>,
                          money(p.rateCents),
                          <Pill key="2fa" tone={p.twoFactor ? 'success' : 'warning'}>
                            {p.twoFactor ? 'On' : 'Off'}
                          </Pill>,
                          <span key="active" className="cl-muted">
                            {p.lastActive}
                          </span>,
                          <Button
                            key="more"
                            variant="ghost"
                            iconOnly
                            icon="more"
                            aria-label={`More actions for ${p.name}`}
                            onClick={() =>
                              notify(`${p.name} · role and rate editing arrives with the firm API`)
                            }
                          />,
                        ],
                      }))}
                    />
                  </div>
                  <Card>
                    <h3 className="cl-t-body-strong" style={{ margin: '0 0 8px' }}>
                      Ethical walls
                    </h3>
                    <p className="cl-t-body-sm cl-muted" style={{ margin: 0 }}>
                      Matter access is firm-wide by default. Restrict a matter to named people from
                      its Settings tab; restricted matters never appear in search, reports or the
                      timer picker for anyone else.
                    </p>
                  </Card>
                </>
              ) : null}
              {section === 'Playbooks' ? (
                <div>
                  <div className="cl-section">
                    <span className="cl-section__title">Practice playbooks</span>
                    <Button
                      onClick={() =>
                        notify('Playbook library · more practice areas arrive with the API')
                      }
                    >
                      Browse library
                    </Button>
                  </div>
                  <div className="cl-list">
                    {(playbooks.data ?? []).map((p) => (
                      <div className="cl-row" key={p.name}>
                        <IconWell name="briefcase" />
                        <div className="cl-row__body">
                          <div className="cl-row__title">{p.name}</div>
                          <div className="cl-row__sub">{p.meta}</div>
                        </div>
                        <Pill>
                          {p.matterCount} matter{p.matterCount === 1 ? '' : 's'}
                        </Pill>
                        <Switch
                          label={`${p.name} enabled`}
                          checked={p.enabled}
                          onChange={(on) => {
                            const undo = writes.togglePlaybook(p.name);
                            notify(
                              `${p.name} playbook ${on ? 'enabled' : 'disabled'}`,
                              'Undo',
                              undo,
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {section === 'Billing' ? (
                <>
                  <Card>
                    <h2 className="cl-t-title-3" style={{ marginBottom: 14 }}>
                      Billing &amp; rates
                    </h2>
                    <div className="cl-form">
                      <FormRow>
                        <Field label="Default terms">
                          <NativeSelect
                            label="Default terms"
                            value={s.defaultTerms}
                            onChange={(value) => {
                              const undo = writes.patchSettings({ defaultTerms: value });
                              notify(`Default terms · ${value}`, 'Undo', undo);
                            }}
                            options={['Due on receipt', 'Net 15', 'Net 30', 'Net 60'].map(
                              (value) => ({ value, label: value }),
                            )}
                          />
                        </Field>
                        <Field label="Rounding">
                          <NativeSelect
                            label="Rounding"
                            value="0.1h · round up"
                            onChange={() => notify('Rounding is fixed at 0.1h · round up')}
                            options={[{ value: '0.1h · round up', label: '0.1h · round up' }]}
                          />
                        </Field>
                      </FormRow>
                      <FormRow>
                        <Field label="Card surcharge">
                          <div className="cl-input">
                            <span className="cl-num">2.9%</span>
                            <span className="cl-muted">· shown before payment</span>
                          </div>
                        </Field>
                        <Field label="Late fee">
                          <div className="cl-input">
                            <span className="cl-num">1.0% / month</span>
                            <span className="cl-muted">· after 30 days</span>
                          </div>
                        </Field>
                      </FormRow>
                    </div>
                    <div className="cl-divider" style={{ margin: '18px 0' }} />
                    <div className="cl-stack cl-stack--sm">
                      {toggle(
                        'textToPay',
                        'Text-to-pay on every invoice',
                        'ACH first, card second',
                      )}
                      {toggle(
                        'autoNudge',
                        'Auto-nudge overdue invoices',
                        'Day 7 · 21 · 45 · you approve each text',
                      )}
                      {toggle('ledes', 'LEDES 1998B export', 'For insurer and corporate clients')}
                    </div>
                  </Card>
                  <div>
                    <div className="cl-section">
                      <span className="cl-section__title">Standard rates</span>
                    </div>
                    <Table
                      compact
                      columns={[
                        { key: 'name', header: 'Timekeeper' },
                        { key: 'standard', header: 'Standard', align: 'right' },
                        { key: 'panel', header: 'Insurance panel', align: 'right' },
                        { key: 'probono', header: 'Pro bono', align: 'right' },
                      ]}
                      rows={(people.data ?? []).map((p) => ({
                        id: p.id,
                        strong: [1],
                        cells: [
                          p.name,
                          money(p.rateCents),
                          money(p.panelRateCents),
                          <span key="pb" className="cl-muted">
                            {money(p.proBonoRateCents)}
                          </span>,
                        ],
                      }))}
                    />
                  </div>
                </>
              ) : null}
              {section === 'Integrations' ? (
                <>
                  <div className="cl-list">
                    {(integrations.data ?? []).map((i) => (
                      <div className="cl-row" key={i.name}>
                        <IconWell
                          name={i.icon as IconName}
                          tone={i.connected ? 'accent' : 'neutral'}
                        />
                        <div className="cl-row__body">
                          <div className="cl-row__title">{i.name}</div>
                          <div className="cl-row__sub">{i.meta}</div>
                        </div>
                        <Pill tone={i.connected ? 'success' : 'outline'} dot={i.connected}>
                          {i.connected ? 'Connected' : 'Not connected'}
                        </Pill>
                        <Button
                          variant={i.connected ? 'ghost' : 'secondary'}
                          onClick={() => {
                            const undo = writes.toggleIntegration(i.name);
                            notify(
                              `${i.name} ${i.connected ? 'disconnected' : 'connected'}`,
                              'Undo',
                              undo,
                            );
                          }}
                        >
                          {i.connected ? 'Disconnect' : 'Connect'}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Banner
                    tone="outline"
                    icon="pen"
                    title="AI features"
                    text="Narrative cleanup, voice-memo parsing, deadline chains and first replies run on de-identified text. Nothing is applied or sent without a person tapping the button. Disclosure text appears on client-facing messages."
                    style={{ alignItems: 'flex-start' }}
                    actions={
                      <>
                        <Switch
                          label="AI features"
                          checked={s.aiEnabled}
                          style={{ alignSelf: 'center' }}
                          onChange={(checked) => {
                            const undo = writes.patchSettings({ aiEnabled: checked });
                            notify(
                              `AI features ${checked ? 'enabled' : 'disabled'} for the firm`,
                              'Undo',
                              undo,
                            );
                          }}
                        />
                        <span className="cl-t-caption cl-muted" style={{ alignSelf: 'center' }}>
                          {s.aiEnabled ? 'Enabled for the firm' : 'Off for the firm'}
                        </span>
                      </>
                    }
                  />
                </>
              ) : null}
              {section === 'Security' ? (
                <>
                  <Card>
                    <h2 className="cl-t-title-3" style={{ marginBottom: 8 }}>
                      Security
                    </h2>
                    <div className="cl-stack cl-stack--sm">
                      {toggle(
                        'requireTwoFactor',
                        'Require two-step verification',
                        `All ${people.data?.filter((p) => p.twoFactor).length ?? 0} users enrolled`,
                      )}
                      {toggle(
                        'biometric',
                        'Biometric session on mobile',
                        'Face ID / fingerprint · never re-login',
                      )}
                      {toggle(
                        'autoLock',
                        'Courthouse mode auto-lock',
                        'Lock after 15 minutes idle',
                      )}
                      {toggle('sso', 'Firm SSO (SAML)', 'Available on Firm plan')}
                    </div>
                  </Card>
                  <div>
                    <div className="cl-section">
                      <span className="cl-section__title">Active sessions</span>
                    </div>
                    <div className="cl-list">
                      <div className="cl-row">
                        <IconWell name="panel" />
                        <div className="cl-row__body">
                          <div className="cl-row__title">MacBook Pro · Safari · San Francisco</div>
                          <div className="cl-row__sub">This device · now</div>
                        </div>
                        <Pill tone="success" dot>
                          Current
                        </Pill>
                        {auth ? (
                          <Button
                            variant="ghost"
                            disabled={signingOut}
                            onClick={() => void signOut()}
                          >
                            {signingOut ? 'Signing out…' : 'Sign out'}
                          </Button>
                        ) : null}
                      </div>
                      {s.mobileSession ? (
                        <div className="cl-row">
                          <IconWell name="phone" />
                          <div className="cl-row__body">
                            <div className="cl-row__title">iPhone 17 Pro · Clepso app</div>
                            <div className="cl-row__sub">Face ID · last active 8:41 AM</div>
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              const undo = writes.patchSettings({ mobileSession: false });
                              notify(
                                'iPhone signed out · Face ID re-enrolls on next open',
                                'Undo',
                                undo,
                              );
                            }}
                          >
                            Sign out
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Card style={{ borderColor: 'var(--danger-bg)' }}>
                    <div className="cl-spread">
                      <div>
                        <h3 className="cl-t-body-strong" style={{ margin: 0 }}>
                          Export all firm data
                        </h3>
                        <p className="cl-t-caption cl-muted" style={{ margin: '2px 0 0' }}>
                          Matters, time, invoices, trust ledgers and documents · JSON today, CSV +
                          PDF with the API
                        </p>
                      </div>
                      <Button onClick={() => void exportData()}>Request export</Button>
                    </div>
                  </Card>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </Page>
    </QueryGate>
  );
}
