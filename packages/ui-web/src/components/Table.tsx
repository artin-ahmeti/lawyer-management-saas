import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export interface TableColumn {
  key: string;
  header: ReactNode;
  /** Right-align numeric columns (tabular figures). */
  align?: 'left' | 'right';
  width?: number | string;
}

export interface TableRow {
  id: string;
  /** One cell per column, in column order. */
  cells: ReactNode[];
  selected?: boolean;
  /** `group` renders a full-width group header (put its label in cells[0]); `foot` renders the totals row. */
  kind?: 'row' | 'group' | 'foot';
  /** Numeric cells to bold. */
  strong?: number[];
  onClick?: () => void;
}

export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  columns: TableColumn[];
  rows: TableRow[];
  /** 36px rows instead of 44. */
  compact?: boolean;
}

/**
 * Dense, scannable web table: overline headers, right-aligned tabular numbers,
 * group rows with subtotals and a footer with totals. Hover tints a row 3%;
 * selection uses the accent tint.
 */
export function Table({ columns, rows, compact, className, ...rest }: TableProps) {
  return (
    <div className={cx('cl-table-wrap', className)} {...rest}>
      <table className={cx('cl-table', compact && 'cl-table--compact')}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cx(c.align === 'right' && 'num')}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            if (r.kind === 'group') {
              return (
                <tr key={r.id} className="cl-table__group">
                  {r.cells.length > 1 ? (
                    r.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={cx(columns[i]?.align === 'right' && 'num')}
                        colSpan={i === 0 ? columns.length - r.cells.length + 1 : 1}
                      >
                        {cell}
                      </td>
                    ))
                  ) : (
                    <td colSpan={columns.length}>{r.cells[0]}</td>
                  )}
                </tr>
              );
            }
            return (
              <tr
                key={r.id}
                className={cx(r.kind === 'foot' && 'cl-table__foot', r.selected && 'is-selected')}
                onClick={r.onClick}
              >
                {r.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={cx(
                      columns[i]?.align === 'right' && 'num',
                      r.strong?.includes(i) && 'strong',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export interface CellTitleProps {
  title: ReactNode;
  /** Second line in caption style (mono identifier · practice area). */
  sub?: ReactNode;
}

/** Two-line table cell: bold title over a caption. */
export function CellTitle({ title, sub }: CellTitleProps) {
  return (
    <>
      <span className="cell-title">{title}</span>
      {sub ? <span className="cell-sub">{sub}</span> : null}
    </>
  );
}

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Right-aligned cluster (density toggle, primary button). */
  right?: ReactNode;
}

/** Table toolbar: search, chips, and a right-aligned cluster. */
export function Toolbar({ children, right, className, ...rest }: ToolbarProps) {
  return (
    <div className={cx('cl-toolbar', className)} {...rest}>
      {children}
      {right ? <div className="cl-toolbar__right">{right}</div> : null}
    </div>
  );
}
