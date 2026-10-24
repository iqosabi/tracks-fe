import type { ApiRecord } from '../../core/types';
export interface Ownership {
  operator: ApiRecord;
  kind: 'buses' | 'routes';
}
export interface Modal {
  title: string;
  kind: 'form' | 'confirm' | 'assign' | 'token' | 'detail';
  row?: ApiRecord;
  mode?: 'create' | 'edit';
  action?: 'rotate' | 'remove' | 'detach';
  token?: string;
}
