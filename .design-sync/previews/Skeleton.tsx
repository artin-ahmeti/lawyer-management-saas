import { Card, List, Skeleton, SkeletonRow } from '@lawfirm/ui-web';

export const Shapes = () => (
  <div style={{ maxWidth: 358 }}>
    <Card>
      <div className="cl-inline" style={{ gap: 14 }}>
        <Skeleton width={36} height={36} circle />
        <Skeleton width={24} height={24} circle />
        <Skeleton width={140} />
        <Skeleton width={90} height={10} />
        <Skeleton width={56} height={24} />
        <Skeleton width={120} height={44} />
      </div>
    </Card>
  </div>
);

export const LoadingCard = () => (
  <div style={{ maxWidth: 358 }}>
    <Card>
      <div className="cl-spread">
        <Skeleton width="45%" height={16} />
        <Skeleton width={64} height={24} />
      </div>
      <div style={{ marginTop: 14 }}>
        <Skeleton width="55%" height={28} />
      </div>
      <div className="cl-stack cl-stack--sm" style={{ marginTop: 14 }}>
        <Skeleton width="85%" />
        <Skeleton width="70%" />
        <Skeleton width="60%" />
      </div>
    </Card>
  </div>
);

export const LoadingList = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </List>
  </div>
);
