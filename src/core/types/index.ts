export type ApiRecord = Record<string, unknown>;

export interface Disposable {
  destroy(): void;
}

export interface FeatureController extends Disposable {
  refresh(): Promise<void>;
}

export type Notify = (message: string) => void;

export interface TablePage {
  page: number;
  limit: number;
  q: string;
}
