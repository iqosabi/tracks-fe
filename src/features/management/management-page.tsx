import { ManagementModal } from './management-modal';
import type { Modal, Ownership } from './types';
import { useCallback, useMemo, useState } from 'react';
import type { AuthClient } from '../../core/auth/client';
import { apiFor } from '../../core/api/client';
import type { ApiRecord, Notify, TablePage } from '../../core/types';
import { readConfig } from '../../core/config/runtime';
import { useRequest } from '../../shared/hooks/use-request';
import { DataTableView } from '../../shared/ui/data-table/data-table';
import { record, messageOf } from '../../shared/data/guards';
import { pick } from '../../shared/data/presentation';
import { statusText, time } from '../../shared/data/formatters';
import {
  modules,
  canWrite,
  recordId,
  recordPath,
  validateDates,
  type ModuleId,
} from './definitions';
import { managementApi, listEndpoint } from './api';
import { Field } from './fields';
interface Props {
  id: ModuleId;
  auth: AuthClient;
  revision: number;
  notify: Notify;
}
export function ManagementPage({ id, auth, revision, notify }: Props) {
  const spec = modules[id],
    role = auth.user?.role ?? 'OPERATOR_VIEWER';
  const api = useMemo(() => managementApi(apiFor(auth)), [auth]);
  const [tablePage, setTablePage] = useState<TablePage>({ page: 1, limit: 25, q: '' });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [path, setPath] = useState(spec.path),
    [context, setContext] = useState<Ownership | null>(null),
    [localRevision, setLocalRevision] = useState(0),
    [filterError, setFilterError] = useState(''),
    [modal, setModal] = useState<Modal | null>(null);
  const [formKey, setFormKey] = useState(0);
  const writable =
    canWrite(spec, role) &&
    !['usage', 'history', 'audit', 'operatorSummary', 'account', 'health'].includes(id);
  const allowed = !spec.super || role === 'SUPER_ADMIN';
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (spec.health) return { health: await api.health(readConfig().cmsBase, signal) };
      return api.request(
        listEndpoint(context ? { ...spec, paginated: true } : spec, {
          ...tablePage,
          filters,
          path,
        }),
        { signal },
      );
    },
    [api, spec, tablePage, filters, path, context],
  );
  const state = useRequest(
    load,
    allowed && (!spec.history || !!filters.deviceId),
    revision + localRevision,
  );
  const titleFor = (row: ApiRecord) =>
    String(
      pick(row, 'bodyNo', 'label', 'name', 'username', 'value', 'code', 'deviceName') ??
        'Data terpilih',
    );
  const refresh = () => setLocalRevision((value) => value + 1);
  const reset = () => {
    setTablePage({ page: 1, limit: 25, q: '' });
    setFilters({});
    setFilterError('');
    setFormKey((value) => value + 1);
  };
  const actions = (row: ApiRecord, index: number) => {
    if (
      recordId(row, context ? { idField: context.kind === 'routes' ? 'code' : undefined } : spec) ==
      null
    )
      return '';
    const button = (action: string, label: string) =>
      `<button class="button secondary action-button" data-action="${action}" data-index="${index}">${label}</button>`;
    return context
      ? button('detach', 'Lepas akses')
      : (spec.detail ? button('detail', 'Detail') : '') +
          (spec.ownership ? button('buses', 'Bus') + button('routes', 'Rute') : '') +
          (writable && spec.edit ? button('edit', spec.ticket ? 'Ubah status' : 'Ubah') : '') +
          (writable && spec.rotate ? button('rotate', 'Rotasi token') : '') +
          (writable && spec.remove
            ? button('remove', id === 'devices' ? 'Nonaktifkan' : 'Hapus')
            : '');
  };
  const hasActions = !!(
    context ||
    spec.detail ||
    spec.ownership ||
    (writable && (spec.edit || spec.rotate || spec.remove))
  );
  const onAction = (action: string, row: ApiRecord) => {
    if (action === 'buses' || action === 'routes') {
      setContext({ operator: row, kind: action });
      setPath(recordPath(spec, recordId(row, spec)) + '/' + action);
      reset();
    } else if (action === 'edit')
      setModal({ title: 'Ubah ' + spec.title.toLowerCase(), kind: 'form', mode: 'edit', row });
    else if (action === 'detail') setModal({ title: 'Detail bus', kind: 'detail', row });
    else if (action === 'rotate' || action === 'remove' || action === 'detach')
      setModal({
        title:
          action === 'rotate'
            ? 'Rotasi token'
            : action === 'detach'
              ? 'Lepas akses'
              : id === 'devices'
                ? 'Nonaktifkan perangkat'
                : 'Hapus data',
        kind: 'confirm',
        action,
        row,
      });
  };
  if (!allowed) return <div className="notice error">Anda tidak memiliki akses ke modul ini.</div>;
  const user = record(
    record(state.data).user ?? record(record(state.data).data).user ?? state.data,
  );
  const health = record(state.data).health;
  return (
    <>
      {context ? (
        <div className="context-bar">
          <button
            className="button secondary"
            id="back"
            onClick={() => {
              setContext(null);
              setPath(spec.path);
              reset();
            }}
          >
            ← Semua operator
          </button>
          <strong>
            {titleFor(context.operator)} / {context.kind === 'buses' ? 'Bus' : 'Rute'}
          </strong>
          <button
            className="button primary"
            id="assign"
            onClick={() =>
              setModal({
                title: context.kind === 'buses' ? 'Tetapkan bus' : 'Tambahkan akses rute',
                kind: 'assign',
              })
            }
          >
            {context.kind === 'buses' ? 'Tetapkan bus' : 'Tambah akses rute'}
          </button>
        </div>
      ) : null}
      {spec.tabs ? (
        <div className="module-tabs">
          {spec.tabs.map(([label, endpoint]) => (
            <button
              className={`button ${path === endpoint ? 'primary' : 'secondary'}`}
              key={endpoint}
              data-tab={endpoint}
              disabled={state.busy}
              onClick={() => {
                setPath(endpoint);
                setTablePage((value) => ({ ...value, page: 1 }));
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {!spec.health && !spec.profile ? (
        <form
          key={formKey}
          id="module-filter"
          className="module-filter filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            try {
              const values: Record<string, string> = validateDates(
                Object.fromEntries(
                  (spec.filters ?? []).map((field) => [
                    field.key,
                    String(data.get(field.key) ?? ''),
                  ]),
                ),
                { history: spec.history },
              );
              if (spec.history && !values.deviceId) throw Error('Pilih perangkat terlebih dahulu.');
              setFilters(values);
              setTablePage((value) => ({ ...value, page: 1 }));
              setFilterError('');
            } catch (error) {
              setFilterError(messageOf(error));
            }
          }}
        >
          {!context
            ? (spec.filters ?? []).map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  row={filters}
                  filtering
                  api={api}
                  role={role}
                />
              ))
            : null}
          {spec.filters && !context ? (
            <div className="filter-actions">
              <button type="button" id="module-reset" className="button secondary" onClick={reset}>
                Reset
              </button>
              <button type="submit" className="button primary">
                Terapkan filter
              </button>
            </div>
          ) : null}
          {!context && writable && spec.create ? (
            <button
              type="button"
              id="create"
              className="button primary"
              onClick={() =>
                setModal({
                  title: 'Tambah ' + spec.title.toLowerCase(),
                  kind: 'form',
                  mode: 'create',
                })
              }
            >
              + Tambah {spec.title.toLowerCase()}
            </button>
          ) : null}
        </form>
      ) : null}
      <div id="module-status" role="status">
        {filterError || state.error ? (
          <div className="notice error">{filterError || state.error}</div>
        ) : state.busy ? (
          'Memperbarui…'
        ) : state.updatedAt ? (
          'Diperbarui ' + time(state.updatedAt)
        ) : spec.history ? (
          'Pilih perangkat untuk menampilkan riwayat GPS.'
        ) : (
          ''
        )}
      </div>
      <section className="panel module-panel">
        <div id="module-data">
          {spec.health ? (
            <div className="health-grid">
              {Array.isArray(health)
                ? health.map((entry: unknown) => {
                    const item = record(entry);
                    return (
                      <article className="health-card" key={String(item.label)}>
                        <span>{String(item.label)}</span>
                        <strong className={item.ready ? 'green' : 'destructive'}>
                          {item.ready ? 'Terhubung' : 'Tidak tersedia'}
                        </strong>
                      </article>
                    );
                  })
                : null}
            </div>
          ) : spec.profile ? (
            <div className="profile-summary">
              <span>
                Username<strong>{String(user.username ?? '—')}</strong>
              </span>
              <span>
                Peran<strong>{statusText(user.role)}</strong>
              </span>
              <span>
                Status<strong>Terautentikasi</strong>
              </span>
            </div>
          ) : (
            <DataTableView
              key={`${id}:${path}:${formKey}`}
              kind={context?.kind ?? spec.kind}
              payload={state.data}
              remote={!!spec.paginated || !!context}
              serverSearch={!!spec.search}
              page={tablePage}
              busy={state.busy}
              actions={hasActions ? actions : undefined}
              onAction={onAction}
              onChange={setTablePage}
            />
          )}
        </div>
      </section>
      {modal ? (
        <ManagementModal
          key={modal.title}
          modal={modal}
          id={id}
          auth={auth}
          path={path}
          context={context}
          onClose={() => setModal(null)}
          onSaved={(result) => {
            setModal(null);
            refresh();
            notify('Aksi berhasil.');
            if ((id === 'devices' && modal.mode === 'create') || modal.action === 'rotate') {
              const data = record(result),
                nested = record(data.data),
                token = data.token ?? data.deviceToken ?? nested.token ?? nested.deviceToken;
              if (typeof token === 'string')
                setModal({ title: 'Token perangkat baru', kind: 'token', token });
              else notify('Token tidak ditemukan pada format respons yang diterima.');
            }
          }}
        />
      ) : null}
    </>
  );
}
