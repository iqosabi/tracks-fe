import { paginationMeta } from '../../shared/data/pagination';
import { loadLookup } from './api';
import { useEffect, useState } from 'react';
import type { ApiClient } from '../../core/api/client';
import type { Role } from '../../core/auth/schema';
import type { ApiRecord } from '../../core/types';
import { items, pick } from '../../shared/data/records';
import { statusText } from '../../shared/data/formatters';
import { messageOf } from '../../shared/data/guards';
import type { FieldSpec } from './definitions';
interface Props {
  field: FieldSpec;
  row?: ApiRecord;
  editing?: boolean;
  filtering?: boolean;
  api: ApiClient;
  role: Role;
  disabled?: boolean;
  onChange?: (value: string) => void;
}
function LookupField({ field, row = {}, editing, filtering, api, role, disabled }: Props) {
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [busy, setBusy] = useState(false),
    [rows, setRows] = useState<ApiRecord[]>([]),
    [error, setError] = useState(''),
    [value, setValue] = useState(String(row[field.key] ?? ''));
  useEffect(() => {
    if (field.type === 'operator' && role !== 'SUPER_ADMIN') return;
    const abort = new AbortController();
    setBusy(true);
    const timer = setTimeout(
      () => {
        void loadLookup(api, field.type, query, abort.signal, page)
          .then((payload) => {
            if (!abort.signal.aborted) {
              const batch = items(payload) ?? [];
              setRows((previous) => (page === 1 ? batch : [...previous, ...batch]));
              setHasMore(paginationMeta(payload, page, 200, batch.length).hasNext);
              setBusy(false);
              setError('');
            }
          })
          .catch((reason: unknown) => {
            if (!abort.signal.aborted) {
              setError(messageOf(reason));
              setBusy(false);
            }
          });
      },
      query ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [api, query, field.type, role, page]);
  if (field.type === 'operator' && role !== 'SUPER_ADMIN') return null;
  const options = rows.flatMap((row) => {
    const id =
      field.type === 'route' ? (row.code ?? row.routeCode) : (row.id ?? row.busId ?? row.deviceId);
    return id === undefined
      ? []
      : [
          {
            value: String(id),
            label: String(
              pick(
                row,
                ...(field.type === 'route'
                  ? ['value', 'name', 'code']
                  : field.type === 'bus'
                    ? ['bodyNo', 'plateNo']
                    : ['label', 'name', 'bodyNo', 'code']),
              ) ?? 'Tanpa nama',
            ),
          },
        ];
  });
  return (
    <label className="field">
      {field.label}
      <details className="lookup-search">
        <summary aria-label={`Cari pilihan ${field.label.toLowerCase()}`}>⌕</summary>
        <input
          type="search"
          aria-label={`Cari pilihan ${field.label.toLowerCase()}`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Cari pilihan…"
        />
      </details>
      <select
        name={field.key}
        data-lookup={field.type}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required={!editing && !filtering}
        disabled={disabled}
      >
        <option value="">
          {filtering ? 'Semua' : editing ? 'Tidak diubah' : 'Pilih'} {field.label.toLowerCase()}
        </option>
        {value && !options.some((option) => option.value === value) ? (
          <option value={value}>Pilihan saat ini</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasMore ? (
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => setPage((value) => value + 1)}
        >
          Muat pilihan berikutnya
        </button>
      ) : null}
      <small data-lookup-note>{error}</small>
    </label>
  );
}
export function Field(props: Props) {
  const { field, row = {}, editing = false, filtering = false, disabled, onChange } = props;
  if (['bus', 'route', 'device', 'operator'].includes(field.type))
    return <LookupField {...props} />;
  let value = row[field.key];
  if (field.type === 'milliseconds' && value !== undefined) value = Number(value) / 1000;
  if (field.type === 'datetime-local' && value) {
    const d = new Date(String(value));
    value = Number.isFinite(d.getTime())
      ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 23)
      : '';
  }
  const required = !editing && !filtering && field.type !== 'boolean';
  const options =
    field.type === 'boolean'
      ? ['true', 'false']
      : field.type === 'role'
        ? ['OPERATOR_VIEWER', 'OPERATOR_ADMIN', 'SUPER_ADMIN']
        : field.type === 'ticketStatus'
          ? ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
          : null;
  return (
    <label className="field">
      {field.label}
      {required ? <span className="required">*</span> : null}
      {options ? (
        <select
          name={field.key}
          defaultValue={
            value === undefined
              ? field.type === 'boolean' && !editing
                ? 'true'
                : ''
              : String(value)
          }
          required={required}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
        >
          {field.type !== 'boolean' || editing ? (
            <option value="">
              {filtering
                ? 'Semua status'
                : editing
                  ? 'Tidak diubah'
                  : 'Pilih ' + field.label.toLowerCase()}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {statusText(option)}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          name={field.key}
          rows={3}
          defaultValue={String(value ?? '')}
          required={required}
        />
      ) : (
        <input
          name={field.key}
          type={field.type === 'milliseconds' ? 'number' : field.type}
          defaultValue={field.type === 'password' ? '' : String(value ?? '')}
          required={required}
          min={['number', 'milliseconds'].includes(field.type) ? '0.001' : undefined}
          step={
            field.type === 'datetime-local'
              ? '0.001'
              : ['number', 'milliseconds'].includes(field.type)
                ? 'any'
                : undefined
          }
          autoComplete={field.type === 'password' ? 'new-password' : 'off'}
        />
      )}
    </label>
  );
}
