import { mutationEndpoint } from './api';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { AuthClient } from '../../core/auth/client';
import { apiFor } from '../../core/api/client';
import type { ApiRecord } from '../../core/types';
import { DataTableView } from '../../shared/ui/data-table/data-table';
import { DialogView } from '../../shared/ui/react-dialog';
import { useRequest } from '../../shared/hooks/use-request';
import { record, messageOf } from '../../shared/data/guards';
import { modules, recordId, recordPath, type ModuleId, type FieldSpec } from './definitions';
import { mutationBody } from './data';
import { Field } from './fields';
import type { Modal, Ownership } from './types';
interface ModalProps {
  modal: Modal;
  id: ModuleId;
  auth: AuthClient;
  path: string;
  context: Ownership | null;
  onClose: () => void;
  onSaved: (result: unknown) => void;
}
export function ManagementModal({ modal, id, auth, path, context, onClose, onSaved }: ModalProps) {
  const spec = modules[id],
    api = apiFor(auth),
    row = modal.row ?? {},
    role = auth.user?.role ?? 'OPERATOR_VIEWER';
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [assignedRole, setAssignedRole] = useState(String(row.role ?? ''));
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const editing = modal.mode === 'edit',
    operation = editing ? spec.edit : spec.create;
  const assignKey = context?.kind === 'routes' ? 'routeCode' : 'busId';
  const fields: FieldSpec[] =
    modal.kind === 'assign'
      ? [
          {
            key: assignKey,
            label: context?.kind === 'routes' ? 'Rute' : 'Bus',
            type: context?.kind === 'routes' ? 'route' : 'bus',
          },
        ]
      : (operation?.fields ?? []);
  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    let endpoint = path,
      method = 'POST',
      body: ApiRecord | undefined;
    try {
      if (modal.kind === 'form') {
        if (!operation) throw new Error('Aksi tidak tersedia.');
        body = mutationBody(fields, new FormData(event!.currentTarget), editing, id, row);
        method = operation.method;
        endpoint = mutationEndpoint(spec, row, { editing, suffix: operation.suffix, path });
      } else if (modal.kind === 'assign') {
        const value = new FormData(event!.currentTarget).get(assignKey);
        if (!value) throw new Error('Pilih data terlebih dahulu.');
        endpoint = path + '/' + encodeURIComponent(String(value));
        method = 'PUT';
      } else {
        endpoint = mutationEndpoint(spec, row, {
          action: modal.action,
          path,
          ownershipKind: context?.kind,
        });
        method = modal.action === 'rotate' ? 'POST' : 'DELETE';
      }
      setBusy(true);
      const result = await api.request(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) onSaved(result);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(messageOf(reason));
        setBusy(false);
      }
    }
  };
  const loadDetail = useCallback(
    (signal: AbortSignal) => api.request(recordPath(spec, recordId(row, spec)), { signal }),
    [api, spec, row],
  );
  const detail = useRequest(loadDetail, modal.kind === 'detail');
  const detailData = record(detail.data);
  return (
    <DialogView title={modal.title} onClose={onClose}>
      {modal.kind === 'token' ? (
        <>
          <p>Token hanya ditampilkan pada respons ini. Salin sebelum menutup.</p>
          <label className="field">
            Token perangkat
            <textarea className="one-time-token" readOnly spellCheck={false} value={modal.token} />
          </label>
          <button
            className="button secondary full"
            id="copy-token"
            onClick={() => {
              void navigator.clipboard
                .writeText(modal.token ?? '')
                .catch(() => setError('Salin token secara manual.'));
            }}
          >
            Salin token
          </button>
        </>
      ) : modal.kind === 'detail' ? (
        <div className="detail-content">
          {detail.error ? (
            <p role="alert">{detail.error}</p>
          ) : (
            <DataTableView
              kind="buses"
              payload={[detailData.bus ?? detailData.data ?? detail.data]}
            />
          )}
        </div>
      ) : modal.kind === 'confirm' ? (
        <>
          <p>
            {modal.action === 'rotate'
              ? 'Token lama akan dicabut. Perangkat harus memakai token baru.'
              : modal.action === 'detach'
                ? 'Operator akan kehilangan akses ke data ini beserta telemetry terkait.'
                : 'Konfirmasi perubahan pada data terpilih.'}
          </p>
          <div className="form-error" role="alert">
            {error}
          </div>
          <button
            className="button danger full"
            id="confirm-action"
            disabled={busy}
            onClick={() => void submit()}
          >
            {modal.title}
          </button>
        </>
      ) : (
        <form className="entity-form" onSubmit={(event) => void submit(event)}>
          {modal.kind === 'assign' ? (
            <p>
              {context?.kind === 'buses'
                ? 'Bus yang dipilih menjadi milik operator ini. Jika sebelumnya dimiliki operator lain, akses telemetry akan berpindah.'
                : 'Operator akan mendapatkan akses ke rute yang dipilih.'}
            </p>
          ) : null}
          {fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              row={row}
              editing={editing}
              api={api}
              role={role}
              disabled={field.key === 'operatorId' && assignedRole === 'SUPER_ADMIN'}
              onChange={field.key === 'role' ? setAssignedRole : undefined}
            />
          ))}
          <div className="form-error" role="alert">
            {error}
          </div>
          <button className="button primary full" type="submit" disabled={busy}>
            {modal.kind === 'assign'
              ? 'Konfirmasi penetapan'
              : 'Simpan ' + spec.title.toLowerCase()}
          </button>
        </form>
      )}
    </DialogView>
  );
}
