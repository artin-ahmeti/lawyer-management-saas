/**
 * Feature availability, in one place. Every section and demo reads its label
 * from here, so reconciling the page before launch is a one-file change.
 *
 * Assumptions (2026-10-01, see HANDOFF.md): nothing is generally available yet.
 * The workspace is built in the staff web and mobile apps but runs on sample
 * data, so it is "preview". The AI workflows exist as designs and demo UI only;
 * they are shown as "preview" with sample data. Voice capture is "planned".
 * Unknown availability is never "available".
 */
export type FeatureStatus = 'available' | 'preview' | 'planned';

export const STATUS_COPY: Record<FeatureStatus, { label: string; description: string }> = {
  available: { label: 'Available', description: 'Available in Clepso today.' },
  preview: {
    label: 'Preview',
    description: 'Not yet generally available. Shown here with sample data.',
  },
  planned: { label: 'Planned', description: 'On the roadmap. Not available yet.' },
};

export const FEATURES = {
  matters: { name: 'Matters and clients', status: 'preview' },
  tasks: { name: 'Tasks and deadlines', status: 'preview' },
  documents: { name: 'Documents and versions', status: 'preview' },
  communication: { name: 'Client communication', status: 'preview' },
  timeBilling: { name: 'Time and billing', status: 'preview' },
  aiEmailActions: { name: 'Email to next actions', status: 'preview' },
  aiMatterBrief: { name: 'Matter brief', status: 'preview' },
  aiTimeEntries: { name: 'Time-entry suggestions', status: 'preview' },
  aiClientUpdate: { name: 'Client-update draft', status: 'preview' },
  voice: { name: 'Voice assistant', status: 'planned' },
  permissions: { name: 'Matter-level permissions', status: 'preview' },
  activityHistory: { name: 'Activity history', status: 'preview' },
} as const satisfies Record<string, { name: string; status: FeatureStatus }>;

export type FeatureKey = keyof typeof FEATURES;

export const statusOf = (key: FeatureKey): FeatureStatus => FEATURES[key].status;

/** True when nothing on the page is generally available yet. */
export const allPreview = (Object.values(FEATURES) as { status: FeatureStatus }[]).every(
  (f) => f.status !== 'available',
);
