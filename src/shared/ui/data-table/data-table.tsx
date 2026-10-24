import { items } from '../../data/records';
import { useEffect, useRef } from 'react';
import { createDataTable, type DataTable } from './index';
import type { TablePage, ApiRecord } from '../../../core/types';
import type { RowActions } from '../../data/presentation';
interface Props {
  payload: unknown;
  kind: string;
  remote?: boolean;
  serverSearch?: boolean;
  page?: TablePage;
  busy?: boolean;
  actions?: RowActions;
  onChange?: (page: TablePage) => void;
  onAction?: (action: string, row: ApiRecord) => void;
}
/** Encapsulates the reusable table engine; effects never mutate DOM owned by sibling React components. */
export function DataTableView({
  payload,
  kind,
  remote = false,
  serverSearch = false,
  page,
  busy = false,
  actions,
  onChange,
  onAction,
}: Props) {
  const container = useRef<HTMLDivElement>(null),
    table = useRef<DataTable | null>(null);
  const callbacks = useRef({ actions, onChange, onAction });
  callbacks.current = { actions, onChange, onAction };
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    table.current = createDataTable({
      element,
      kind,
      remote,
      serverSearch,
      actions: actions ? (row, index) => callbacks.current.actions?.(row, index) ?? '' : undefined,
      onChange: (next) => callbacks.current.onChange?.(next),
    });
    const click = (event: MouseEvent) => {
      const button =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
      if (!button) return;
      const row = (items(payloadRef.current) ?? [])[Number(button.dataset.index)];
      if (row && typeof row === 'object')
        callbacks.current.onAction?.(button.dataset.action ?? '', row);
    };
    element.addEventListener('click', click);
    return () => {
      element.removeEventListener('click', click);
      table.current?.destroy();
      table.current = null;
    };
  }, [kind, remote, serverSearch, !!actions]);
  useEffect(() => {
    table.current?.setData(payload, page);
  }, [payload, page]);
  useEffect(() => {
    table.current?.setBusy(busy);
  }, [busy]);
  return <div ref={container} />;
}
