import { Button, Chip, ChipGroup, Field, Input, Sheet, TimerHero } from '@lawfirm/ui-web';

export const Idle = () => (
  <div style={{ maxWidth: 358 }}>
    <TimerHero time="00:00:00" caption="Choose a matter to start" />
  </div>
);

export const Running = () => (
  <div style={{ maxWidth: 358 }}>
    <TimerHero time="00:42:17" caption="Estate of Harold Bennett · Draft inventory schedules" />
  </div>
);

export const PastAnHour = () => (
  <div style={{ maxWidth: 358 }}>
    <TimerHero time="01:12:04" caption="People v. Marcus Webb · paused" />
  </div>
);

export const StartTimerSheet = () => (
  <div style={{ maxWidth: 358 }}>
    <Sheet title="Start timer">
      <TimerHero time="00:00:00" caption="Choose a matter to start" />
      <ChipGroup style={{ margin: '12px 0 16px' }}>
        <Chip active>Estate of Bennett</Chip>
        <Chip>Kessler — Series B</Chip>
        <Chip>Alvarez v. Meridian</Chip>
      </ChipGroup>
      <Field label="What are you doing?" optional>
        <Input placeholder="e.g. Draft inventory schedules" />
      </Field>
      <Button variant="primary" size="lg" block icon="play" style={{ marginTop: 16 }}>
        Start timer
      </Button>
    </Sheet>
  </div>
);
