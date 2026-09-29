import { Card, MiniBars, Pill } from '@lawfirm/ui-web';

export const HoursVsGoal = () => (
  <div style={{ maxWidth: 358 }}>
    <MiniBars
      title="Hours billed · this week"
      total="21.4h"
      goal={6}
      goalLabel="goal 6h"
      max={9}
      bars={[
        { label: 'Mon', value: 7.1 },
        { label: 'Tue', value: 4.7 },
        { label: 'Wed', value: 6.3 },
        { label: 'Today', value: 3.4, today: true },
        { label: 'Fri', value: 0, future: true },
      ]}
    />
  </div>
);

export const LastWeekNoGoal = () => (
  <div style={{ maxWidth: 358 }}>
    <MiniBars
      title="Hours billed · last week"
      total="31.2h"
      showValues={false}
      bars={[
        { label: 'Mon', value: 6.8 },
        { label: 'Tue', value: 7.4 },
        { label: 'Wed', value: 5.1 },
        { label: 'Thu', value: 6.9 },
        { label: 'Fri', value: 4.2 },
        { label: 'Sat', value: 0.8 },
        { label: 'Sun', value: 0 },
      ]}
    />
  </div>
);

export const InCard = () => (
  <div style={{ maxWidth: 358 }}>
    <Card
      title="Firm hours · September"
      subtitle="Billable, all timekeepers"
      headerAction={
        <Pill tone="success" dot>
          On pace
        </Pill>
      }
    >
      <MiniBars
        total="112.6h"
        goal={30}
        goalLabel="goal 30h/wk"
        max={40}
        bars={[
          { label: 'W1', value: 31.4 },
          { label: 'W2', value: 28.9 },
          { label: 'W3', value: 30.9 },
          { label: 'W4', value: 21.4, today: true },
          { label: 'W5', value: 0, future: true },
        ]}
      />
    </Card>
  </div>
);
