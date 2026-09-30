'use client';

import {
  Breadcrumbs,
  Button,
  CellTitle,
  EmptyState,
  Icon,
  Input,
  List,
  ListRow,
  Pill,
  Table,
  Toolbar,
} from '@lawfirm/ui-web';
import { useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Page, QueryGate } from '@/components/PageState';
import { useDocuments, useMatters, useWrites } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { copyText } from '@/lib/download';
import { ROUTE_META } from '@/lib/routes';
import { useOverlays } from '@/stores/ui';
import { DEFAULT_FOLDER } from './data';

const DEFAULT_MATTER = 'm2';

/**
 * Documents: a matter rail, its folders, and the files in the open folder.
 * Embedded in a matter (the Documents tab) it drops the page head and the
 * matter rail and puts search, Share link and Upload on the toolbar instead.
 */
export function DocumentsPage({
  matterId,
  embedded = false,
}: { matterId?: string; embedded?: boolean } = {}) {
  const documents = useDocuments();
  const matters = useMatters();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const notify = useOverlays((s) => s.notify);
  const fileInput = useRef<HTMLInputElement>(null);
  const { uploadDocuments } = useWrites();
  const [query, setQuery] = useState('');

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const docs = documents.data ?? [];
  const rail = matters.data ?? [];
  const matterParam = matterId ?? params.get('matter');
  const matter =
    rail.find((m) => m.id === matterParam) ?? rail.find((m) => m.id === DEFAULT_MATTER) ?? rail[0];
  const matterDocs = docs.filter((d) => d.matterId === matter?.id);
  const folders = Array.from(new Set(matterDocs.map((d) => d.folder))).map((name) => ({
    name,
    count: matterDocs.filter((d) => d.folder === name).length,
  }));
  const folderParam = params.get('folder');
  const folder =
    folders.find((f) => f.name === folderParam)?.name ??
    folders.find((f) => f.name === DEFAULT_FOLDER)?.name ??
    folders[0]?.name ??
    null;
  const q = query.trim().toLowerCase();
  const folderFiles = matterDocs.filter((d) => d.folder === folder);
  const files = q ? folderFiles.filter((d) => d.name.toLowerCase().includes(q)) : folderFiles;
  const countFor = (matterId: string) => docs.filter((d) => d.matterId === matterId).length;

  const meta = ROUTE_META.documents!;
  const upload = () => fileInput.current?.click();
  const share = async () => {
    try {
      await copyText(
        `${window.location.origin}/documents?matter=${matter?.id ?? ''}&folder=${encodeURIComponent(folder ?? '')}`,
      );
      notify('Workspace link copied · sign-in required');
    } catch {
      notify('Could not copy the link. Use the browser address bar.');
    }
  };

  const actions = (
    <>
      <Button icon="link" onClick={() => void share()}>
        Share link
      </Button>
      <Button variant="primary" icon="upload" onClick={upload}>
        Upload
      </Button>
    </>
  );

  const folderRail = folders.length ? (
    <List>
      {folders.map((f) => (
        <ListRow
          key={f.name}
          regular
          selected={f.name === folder}
          onClick={() => setParams({ folder: f.name })}
          style={{ minHeight: 40, padding: '6px 12px' }}
          lead={<Icon name="folder" style={{ color: 'var(--ink-2)' }} />}
          title={f.name}
          value={<span className="cl-t-caption cl-faint cl-num">{f.count}</span>}
        />
      ))}
    </List>
  ) : null;

  const table =
    matter && folder ? (
      files.length ? (
        <Table
          compact
          columns={[
            { key: 'name', header: 'Name', width: '44%' },
            { key: 'modified', header: 'Modified' },
            { key: 'by', header: 'By' },
            { key: 'size', header: 'Size', align: 'right' },
            { key: 'status', header: '' },
          ]}
          rows={files.map((f) => ({
            id: f.id,
            cells: [
              <span key="name" className="cl-inline cl-inline--nowrap">
                <Icon name="file" style={{ color: 'var(--ink-3)' }} />
                {f.localUrl ? (
                  <a href={f.localUrl} download={f.name}>
                    <CellTitle title={f.name} />
                  </a>
                ) : (
                  <CellTitle title={f.name} />
                )}
              </span>,
              fmtDate(f.modifiedAt),
              f.by,
              f.size,
              <Pill key="status" tone={f.tone}>
                {f.status}
              </Pill>,
            ],
          }))}
        />
      ) : (
        <div className="cl-table-wrap">
          <EmptyState
            icon="search"
            title="No matching files"
            text={`Nothing in ${folder} matches “${query.trim()}”.`}
          />
        </div>
      )
    ) : (
      <div className="cl-table-wrap">
        <EmptyState
          icon="folder"
          title={meta.emptyTitle}
          text={meta.emptyText}
          action={
            <Button variant="primary" icon="upload" onClick={upload}>
              {meta.emptyCta}
            </Button>
          }
        />
      </div>
    );

  return (
    <QueryGate queries={[documents, matters]} routeKey="documents" empty={rail.length === 0}>
      <Page style={embedded ? { padding: 0, minHeight: 0 } : undefined}>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length && matter) {
              const selected = files.map((f) => ({
                name: f.name,
                size: `${(f.size / 1024).toFixed(1)} KB`,
                localUrl: URL.createObjectURL(f),
              }));
              try {
                const undo = uploadDocuments(matter.id, folder ?? 'Documents', selected);
                notify(
                  `${files.length} document${files.length > 1 ? 's' : ''} added to this preview session`,
                  'Undo',
                  () => {
                    undo();
                    selected.forEach((f) => URL.revokeObjectURL(f.localUrl));
                  },
                );
              } catch (cause) {
                selected.forEach((f) => URL.revokeObjectURL(f.localUrl));
                notify(cause instanceof Error ? cause.message : 'Could not add documents.');
              }
            }
            e.target.value = '';
          }}
        />
        {embedded ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: folders.length ? '240px minmax(0, 1fr)' : 'minmax(0, 1fr)',
              gap: 20,
            }}
          >
            {folders.length ? <div style={{ alignSelf: 'start' }}>{folderRail}</div> : null}
            <div className="cl-stack cl-stack--lg">
              <Toolbar right={actions}>
                {folder ? (
                  <Input
                    search
                    icon="search"
                    aria-label={`Search in ${folder}`}
                    placeholder={`Search in ${folder}`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: 240, maxWidth: '100%' }}
                  />
                ) : null}
              </Toolbar>
              {table}
            </div>
          </div>
        ) : (
          <>
            <div className="cl-pagehead">
              <div>
                <h1>Documents</h1>
              </div>
              <div className="cl-pagehead__actions">{actions}</div>
            </div>
            <div className="app-document-grid">
              <div className="cl-stack cl-stack--sm" style={{ alignSelf: 'start' }}>
                <div className="cl-t-overline cl-muted" style={{ padding: '0 4px 4px' }}>
                  Matters
                </div>
                <List>
                  {rail.map((m) => (
                    <ListRow
                      key={m.id}
                      regular
                      selected={m.id === matter?.id}
                      onClick={() => setParams({ matter: m.id, folder: null })}
                      style={{ minHeight: 40, padding: '6px 12px' }}
                      lead={<Icon name="briefcase" style={{ color: 'var(--ink-2)' }} />}
                      title={m.title}
                      value={<span className="cl-t-caption cl-faint cl-num">{countFor(m.id)}</span>}
                    />
                  ))}
                </List>
                {folders.length ? (
                  <>
                    <div className="cl-t-overline cl-muted" style={{ padding: '12px 4px 4px' }}>
                      Folders
                    </div>
                    {folderRail}
                  </>
                ) : null}
              </div>
              <div key={matter?.id} className="cl-stack cl-stack--lg app-fade">
                {matter ? (
                  <Breadcrumbs items={folder ? [matter.title, folder] : [matter.title]} />
                ) : null}
                {table}
              </div>
            </div>
          </>
        )}
      </Page>
    </QueryGate>
  );
}
