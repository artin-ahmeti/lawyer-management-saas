import { Button, Mono, PageHeader, Pill, SegmentedControl, Text } from '@lawfirm/ui-web';

export const MatterDetail = () => (
  <div className="cl-web">
    <PageHeader
      crumbs={['Matters', 'Probate', <Mono ink>2026-0187</Mono>]}
      title="Estate of Harold Bennett"
      meta={
        <>
          <Pill tone="accent">Inventory</Pill>
          <Pill tone="outline">Hourly · $325</Pill>
          <Text variant="label" tone="muted">
            Margaret Bennett · L. Tran · opened May 2
          </Text>
        </>
      }
      actions={
        <>
          <Button variant="secondary" icon="play">
            Start timer
          </Button>
          <Button variant="secondary" icon="message">
            Message client
          </Button>
          <Button variant="primary">New invoice</Button>
          <Button variant="ghost" iconOnly icon="more" aria-label="More" />
        </>
      }
      tabs={
        <SegmentedControl
          scroll
          value="overview"
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'activity', label: 'Activity' },
            { value: 'tasks', label: 'Tasks', count: 4 },
            { value: 'time', label: 'Time', count: 18 },
            { value: 'documents', label: 'Documents' },
            { value: 'billing', label: 'Billing' },
            { value: 'trust', label: 'Trust' },
          ]}
        />
      }
    />
  </div>
);

export const TodayGreeting = () => (
  <div className="cl-web">
    <PageHeader
      eyebrow="Monday, September 29 · Tran & Okafor LLP"
      title="Good morning, Dana."
      greeting
      actions={
        <SegmentedControl
          value="me"
          items={[
            { value: 'me', label: 'Me' },
            { value: 'firm', label: 'Firm' },
          ]}
        />
      }
    />
  </div>
);

export const ListPage = () => (
  <div className="cl-web">
    <PageHeader
      title="Matters"
      actions={
        <>
          <Button variant="secondary" icon="download">
            Import from Clio
          </Button>
          <Button variant="primary" icon="plus">
            New matter
          </Button>
        </>
      }
    />
  </div>
);
