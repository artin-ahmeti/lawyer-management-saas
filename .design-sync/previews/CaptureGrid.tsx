import { CaptureGrid, Chip, ChipGroup, Sheet, Text } from '@lawfirm/ui-web';

export const Default = () => (
  <div style={{ maxWidth: 358 }}>
    <CaptureGrid />
  </div>
);

export const InCaptureSheet = () => (
  <div
    style={{
      maxWidth: 390,
      background: 'var(--surface-2)',
      paddingTop: 40,
      borderRadius: 20,
      overflow: 'hidden',
    }}
  >
    <Sheet
      title="Capture"
      headerRight={
        <Text variant="label" tone="muted">
          to <b style={{ color: 'var(--ink)' }}>Estate of Bennett</b>
        </Text>
      }
    >
      <CaptureGrid />
      <ChipGroup>
        <span className="cl-t-caption cl-muted" style={{ alignSelf: 'center', flex: 'none' }}>
          Recent
        </span>
        <Chip active>Estate of Bennett</Chip>
        <Chip>People v. Webb</Chip>
        <Chip>Kessler</Chip>
      </ChipGroup>
    </Sheet>
  </div>
);

export const MatterContext = () => (
  <div style={{ maxWidth: 358 }}>
    <CaptureGrid
      items={[
        { key: 'timer', label: 'Start timer', icon: 'play', accent: true },
        { key: 'voice', label: 'Voice memo', icon: 'mic', accent: true },
        { key: 'time', label: 'Log time', icon: 'clock', accent: true },
        { key: 'call', label: 'Log call', icon: 'phone' },
        { key: 'doc', label: 'Document', icon: 'upload' },
        { key: 'message', label: 'Message', icon: 'message' },
      ]}
    />
  </div>
);
